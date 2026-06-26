import re
import requests
from app.config import TEXT_EXTENSIONS, SKIP_DIRS, MAX_FILES, MAX_FILE_BYTES, GITHUB_TOKEN

def parse_repo(input_str: str):
    cleaned = input_str.strip()
    if cleaned.startswith('http://') or cleaned.startswith('https://'):
        try:
            from urllib.parse import urlparse
            url = urlparse(cleaned)
            if url.hostname not in ('github.com', 'www.github.com'):
                return None
            cleaned = url.path.lstrip('/')
        except:
            return None
    cleaned = re.sub(r'\.git$', '', cleaned).rstrip('/')
    parts = [p for p in cleaned.split('/') if p]
    if len(parts) < 2:
        return None
    owner, repo = parts[0], parts[1]
    if not re.match(r'^[a-zA-Z0-9_.-]+$', owner) or not re.match(r'^[a-zA-Z0-9_.-]+$', repo):
        return None
    return {"owner": owner, "repo": repo}

def ext(path: str) -> str:
    dot = path.rfind(".")
    return path[dot + 1:].lower() if dot >= 0 else ""

def language_of(path: str) -> str:
    e = ext(path)
    mapping = {
        "ts": "typescript", "tsx": "tsx", "js": "javascript", "jsx": "jsx",
        "py": "python", "rb": "ruby", "go": "go", "rs": "rust", "java": "java",
        "kt": "kotlin", "swift": "swift", "c": "c", "h": "c", "cpp": "cpp", "hpp": "cpp",
        "cs": "csharp", "php": "php", "sh": "bash", "bash": "bash", "zsh": "bash",
        "json": "json", "yaml": "yaml", "yml": "yaml", "toml": "toml",
        "md": "markdown", "mdx": "markdown", "html": "html",
        "css": "css", "scss": "scss", "sass": "sass",
        "vue": "vue", "svelte": "svelte", "astro": "astro",
        "sql": "sql", "graphql": "graphql", "gql": "graphql",
    }
    return mapping.get(e, "text")

def file_score(path: str) -> int:
    s = 0
    lower = path.lower()
    if re.search(r'readme', lower): s += 50
    if re.search(r'^src/', lower): s += 8
    if re.search(r'index\.(t|j)sx?$', lower): s += 6
    if re.search(r'main\.', lower): s += 5
    if re.search(r'package\.json$|pyproject\.toml$|cargo\.toml$|go\.mod$', lower): s += 20
    if re.search(r'test|spec|__tests__', lower): s -= 10
    if re.search(r'\.lock$|lockfile', lower): s -= 50
    s -= min(20, len(lower.split('/')) * 2)
    return s

def should_skip(path: str) -> bool:
    return any(p in SKIP_DIRS for p in path.split("/"))

def fetch_repo_files(owner: str, repo: str):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "GitWhisper/0.1",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    
    res = requests.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
    if res.status_code == 404:
        raise Exception("Repository not found. Make sure it's public and the owner/name is correct.")
    if res.status_code == 403:
        raise Exception("GitHub rate limit hit. Try again in a minute.")
    res.raise_for_status()
    
    repo_data = res.json()
    branch = repo_data.get("default_branch", "main")

    tree_res = requests.get(f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1", headers=headers)
    tree_res.raise_for_status()
    tree_data = tree_res.json()
    
    total_blobs = sum(1 for i in tree_data.get("tree", []) if i.get("type") == "blob")
    
    candidates = []
    for i in tree_data.get("tree", []):
        if i.get("type") != "blob": continue
        if should_skip(i["path"]): continue
        if ext(i["path"]) not in TEXT_EXTENSIONS: continue
        if i.get("size", 0) >= MAX_FILE_BYTES * 2: continue
        i["_score"] = file_score(i["path"])
        candidates.append(i)
        
    candidates.sort(key=lambda x: x["_score"], reverse=True)
    candidates = candidates[:MAX_FILES]
    
    files = []
    for c in candidates:
        try:
            r = requests.get(
                f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{c['path']}",
                headers={"User-Agent": "GitWhisper/0.1"}
            )
            if r.status_code == 200:
                files.append({"path": c["path"], "content": r.text[:MAX_FILE_BYTES]})
        except:
            pass
            
    return {
        "branch": branch,
        "totalBlobs": total_blobs,
        "consideredFiles": len(candidates),
        "files": files
    }
