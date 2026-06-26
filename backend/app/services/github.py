"""
GitHub ingestion service.

Responsibilities:
  1. Parse / validate a GitHub repo identifier.
  2. Fetch repository metadata (name, branch, primary language).
  3. Walk the git tree, filter blobs, and download file content.
  4. Detect the language of every file via extension lookup.
"""

import re
from typing import Optional
from urllib.parse import urlparse

import requests

from app.config import (
    TEXT_EXTENSIONS,
    SKIP_DIRS,
    MAX_FILES,
    MAX_FILE_BYTES,
    GITHUB_TOKEN,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_GITHUB_API = "https://api.github.com"
_RAW_BASE = "https://raw.githubusercontent.com"

_SKIP_EXTENSIONS = {
    "jpg", "jpeg", "png", "gif", "svg", "ico", "webp", "bmp",
    "zip", "tar", "gz", "bz2", "rar", "7z",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt",
    "lock", "sum",          # dependency lock files
    "map",                  # source maps
    "wasm", "pyc", "class",
    "ttf", "otf", "woff", "woff2", "eot",
    "mp3", "mp4", "wav", "ogg",
    "exe", "dll", "so", "dylib",
}

_SKIP_FILENAME_PATTERNS = re.compile(
    r"(\.min\.(js|css)$|\.bundle\.js$|package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$)",
    re.IGNORECASE,
)

# Comprehensive extension → language mapping
_LANGUAGE_MAP: dict[str, str] = {
    # TypeScript / JavaScript family
    "ts": "typescript", "tsx": "tsx",
    "js": "javascript", "jsx": "jsx",
    "mjs": "javascript", "cjs": "javascript",
    # Systems
    "py": "python",
    "rb": "ruby",
    "go": "go",
    "rs": "rust",
    "java": "java",
    "kt": "kotlin",
    "swift": "swift",
    "c": "c", "h": "c",
    "cpp": "cpp", "cc": "cpp", "cxx": "cpp",
    "hpp": "cpp", "hxx": "cpp",
    "cs": "csharp",
    "php": "php",
    # Shell
    "sh": "bash", "bash": "bash", "zsh": "bash",
    # Data / config
    "json": "json",
    "yaml": "yaml", "yml": "yaml",
    "toml": "toml",
    "xml": "xml",
    "env": "dotenv",
    # Docs
    "md": "markdown", "mdx": "markdown",
    "txt": "text",
    # Web
    "html": "html", "htm": "html",
    "css": "css", "scss": "scss", "sass": "sass", "less": "css",
    "vue": "vue", "svelte": "svelte", "astro": "astro",
    # Query
    "sql": "sql",
    "graphql": "graphql", "gql": "graphql",
}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def parse_repo(input_str: str) -> Optional[dict]:
    """
    Accept either ``owner/repo`` or a full ``https://github.com/owner/repo`` URL.
    Returns ``{"owner": str, "repo": str}`` or ``None`` when invalid.
    """
    cleaned = input_str.strip()

    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        try:
            parsed_url = urlparse(cleaned)
            if parsed_url.hostname not in ("github.com", "www.github.com"):
                return None
            cleaned = parsed_url.path.lstrip("/")
        except ValueError:
            return None

    # Strip trailing .git or slashes
    cleaned = re.sub(r"\.git$", "", cleaned).rstrip("/")
    parts = [p for p in cleaned.split("/") if p]

    if len(parts) < 2:
        return None

    owner, repo = parts[0], parts[1]
    valid_ident = re.compile(r"^[a-zA-Z0-9_.\-]+$")
    if not valid_ident.match(owner) or not valid_ident.match(repo):
        return None

    return {"owner": owner, "repo": repo}


def language_of(path: str) -> str:
    """Return the language name for a file path based on its extension."""
    dot = path.rfind(".")
    extension = path[dot + 1 :].lower() if dot >= 0 else ""
    return _LANGUAGE_MAP.get(extension, "text")


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _make_headers() -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GitWhisper/1.0",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _get_extension(path: str) -> str:
    dot = path.rfind(".")
    return path[dot + 1 :].lower() if dot >= 0 else ""


def _should_skip_path(path: str) -> bool:
    """Return True if the path belongs to a skipped directory or has a skipped extension."""
    parts = path.split("/")

    # Check every path segment against the SKIP_DIRS blocklist
    if any(part in SKIP_DIRS for part in parts):
        return True

    ext = _get_extension(path)
    if ext in _SKIP_EXTENSIONS:
        return True

    if _SKIP_FILENAME_PATTERNS.search(path):
        return True

    return False


def _file_priority_score(path: str) -> int:
    """
    Heuristic priority score for selecting the most important files when a
    repository exceeds MAX_FILES.  Higher is better.
    """
    score = 0
    lower = path.lower()

    # High-value entry points
    if re.search(r"readme", lower):
        score += 50
    if re.search(r"package\.json$|pyproject\.toml$|cargo\.toml$|go\.mod$", lower):
        score += 30
    if re.search(r"(main|index|app|server|api)\.(ts|tsx|js|jsx|py|go|rs)$", lower):
        score += 20

    # Source directories signal real code
    if re.search(r"^(src|lib|core|api|app|server)/", lower):
        score += 10

    # Penalise test / spec files
    if re.search(r"(test|spec|__tests__|\.test\.|\.spec\.)", lower):
        score -= 15

    # Penalise deeply-nested files (prefer shallow structure)
    depth = lower.count("/")
    score -= min(depth * 2, 20)

    return score


def _download_file(owner: str, repo: str, branch: str, path: str) -> Optional[str]:
    """Fetch raw content of a single file.  Returns None on any error."""
    url = f"{_RAW_BASE}/{owner}/{repo}/{branch}/{path}"
    try:
        response = requests.get(
            url,
            headers={"User-Agent": "GitWhisper/1.0"},
            timeout=15,
        )
        if response.status_code == 200:
            return response.text[:MAX_FILE_BYTES]
    except requests.RequestException:
        pass
    return None


# ---------------------------------------------------------------------------
# Main public function
# ---------------------------------------------------------------------------

def fetch_repo_files(owner: str, repo: str) -> dict:
    """
    Fetch metadata and source files for ``owner/repo``.

    Returns a dict with keys:
    - ``branch``           : default branch name
    - ``primary_language`` : GitHub's detected primary language
    - ``totalBlobs``       : total blob count in the tree
    - ``consideredFiles``  : files that passed the filters
    - ``files``            : list of ``{"path", "content", "language"}`` dicts
    """
    headers = _make_headers()

    # 1. Fetch repository metadata
    meta_response = requests.get(
        f"{_GITHUB_API}/repos/{owner}/{repo}",
        headers=headers,
        timeout=15,
    )

    if meta_response.status_code == 404:
        raise ValueError(
            "Repository not found. Check that it is public and the owner/name is correct."
        )
    if meta_response.status_code == 403:
        raise RuntimeError(
            "GitHub rate limit exceeded. Please wait a minute or add a GITHUB_TOKEN."
        )
    meta_response.raise_for_status()

    repo_meta = meta_response.json()
    branch: str = repo_meta.get("default_branch", "main")
    primary_language: str = repo_meta.get("language") or "unknown"

    # 2. Fetch the recursive git tree
    tree_response = requests.get(
        f"{_GITHUB_API}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
        headers=headers,
        timeout=15,
    )
    tree_response.raise_for_status()
    tree_data = tree_response.json()

    all_blobs = [item for item in tree_data.get("tree", []) if item.get("type") == "blob"]
    total_blobs = len(all_blobs)

    # 3. Filter blobs: skip directories, extensions, and oversized files
    candidates = []
    for blob in all_blobs:
        path: str = blob["path"]
        size: int = blob.get("size", 0)

        if _should_skip_path(path):
            continue
        if _get_extension(path) not in TEXT_EXTENSIONS:
            continue
        if size > MAX_FILE_BYTES * 2:
            # Very large files are almost certainly generated or minified
            continue

        candidates.append({
            "path": path,
            "size": size,
            "_score": _file_priority_score(path),
        })

    # 4. Rank by heuristic score and cap at MAX_FILES
    candidates.sort(key=lambda x: x["_score"], reverse=True)
    selected = candidates[:MAX_FILES]

    # 5. Download file contents in order
    files = []
    for candidate in selected:
        content = _download_file(owner, repo, branch, candidate["path"])
        if content is None:
            continue
        files.append({
            "path": candidate["path"],
            "content": content,
            "language": language_of(candidate["path"]),
        })

    return {
        "branch": branch,
        "primary_language": primary_language,
        "totalBlobs": total_blobs,
        "consideredFiles": len(selected),
        "files": files,
    }
