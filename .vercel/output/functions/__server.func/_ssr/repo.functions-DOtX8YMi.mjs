import { T as TSS_SERVER_FUNCTION, c as createServerFn } from "./index.mjs";
import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import { o as objectType, s as stringType, e as enumType, a as arrayType } from "../_libs/zod.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
var createServerRpc = (serverFnMeta, splitImportFn) => {
  const url = "/_serverFn/" + serverFnMeta.id;
  return Object.assign(splitImportFn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const TEXT_EXTENSIONS = /* @__PURE__ */ new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "rb", "go", "rs", "java", "kt", "swift", "c", "h", "cpp", "hpp", "cs", "php", "sh", "bash", "zsh", "json", "yaml", "yml", "toml", "md", "mdx", "txt", "html", "css", "scss", "sass", "vue", "svelte", "astro", "sql", "graphql", "gql"]);
const SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", "out", ".turbo", ".cache", "coverage", ".vercel", ".vite", "vendor", "target", "__pycache__", ".pytest_cache", ".venv", "venv"]);
const MAX_FILES = 60;
const MAX_FILE_BYTES = 3e4;
const CHUNK_LINES = 60;
const CHUNK_OVERLAP = 10;
const TOP_K_CHUNKS = 12;
const MAX_CONTEXT_CHARS = 8e4;
const MessageSchema = objectType({
  role: enumType(["user", "assistant"]),
  content: stringType()
});
const InputSchema = objectType({
  repo: stringType().min(3).max(140),
  question: stringType().min(2).max(2e3),
  history: arrayType(MessageSchema).max(40).optional().default([]),
  // If the client already has the index, it can pass cached files to skip GitHub fetch.
  cachedFiles: arrayType(objectType({
    path: stringType(),
    content: stringType()
  })).max(MAX_FILES * 2).optional()
});
function parseRepo(input) {
  const cleaned = input.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\.git$/, "").replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return {
    owner: parts[0],
    repo: parts[1]
  };
}
function ext(path) {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}
function languageOf(path) {
  const e = ext(path);
  const map = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    h: "c",
    cpp: "cpp",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    md: "markdown",
    mdx: "markdown",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    vue: "vue",
    svelte: "svelte",
    astro: "astro",
    sql: "sql",
    graphql: "graphql",
    gql: "graphql"
  };
  return map[e] ?? "text";
}
function fileScore(path) {
  let s = 0;
  const lower = path.toLowerCase();
  if (/readme/i.test(lower)) s += 50;
  if (/^src\//.test(lower)) s += 8;
  if (/index\.(t|j)sx?$/.test(lower)) s += 6;
  if (/main\./.test(lower)) s += 5;
  if (/package\.json$|pyproject\.toml$|cargo\.toml$|go\.mod$/.test(lower)) s += 20;
  if (/test|spec|__tests__/.test(lower)) s -= 10;
  if (/\.lock$|lockfile/i.test(lower)) s -= 50;
  s -= Math.min(20, lower.split("/").length * 2);
  return s;
}
function shouldSkip(path) {
  return path.split("/").some((p) => SKIP_DIRS.has(p));
}
async function ghFetch(url, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitWhisper/0.1"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, {
    headers
  });
}
async function fetchRepoFiles(owner, repo) {
  const token = process.env.GITHUB_TOKEN;
  const repoRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, token);
  if (!repoRes.ok) {
    if (repoRes.status === 404) throw new Error("Repository not found. Make sure it's public and the owner/name is correct.");
    if (repoRes.status === 403) throw new Error("GitHub rate limit hit. Try again in a minute.");
    throw new Error(`GitHub error: ${repoRes.status}`);
  }
  const repoData = await repoRes.json();
  const branch = repoData.default_branch;
  const treeRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token);
  if (!treeRes.ok) throw new Error(`Failed to load repo tree: ${treeRes.status}`);
  const treeData = await treeRes.json();
  const totalBlobs = treeData.tree.filter((i) => i.type === "blob").length;
  const candidates = treeData.tree.filter((i) => i.type === "blob" && !shouldSkip(i.path)).filter((i) => TEXT_EXTENSIONS.has(ext(i.path))).filter((i) => (i.size ?? 0) < MAX_FILE_BYTES * 2).map((i) => ({
    ...i,
    _score: fileScore(i.path)
  })).sort((a, b) => b._score - a._score).slice(0, MAX_FILES);
  const files = await Promise.all(candidates.map(async (c) => {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${c.path}`, {
        headers: {
          "User-Agent": "GitWhisper/0.1"
        }
      });
      if (!r.ok) return null;
      const text = await r.text();
      return {
        path: c.path,
        content: text.slice(0, MAX_FILE_BYTES)
      };
    } catch {
      return null;
    }
  }));
  return {
    branch,
    totalBlobs,
    consideredFiles: candidates.length,
    files: files.filter((f) => !!f)
  };
}
function chunkFile(file) {
  const lines = file.content.split("\n");
  const chunks = [];
  if (lines.length === 0) return chunks;
  const lang = languageOf(file.path);
  for (let start = 0; start < lines.length; start += CHUNK_LINES - CHUNK_OVERLAP) {
    const end = Math.min(start + CHUNK_LINES, lines.length);
    const code = lines.slice(start, end).join("\n");
    if (code.trim().length === 0) continue;
    chunks.push({
      path: file.path,
      startLine: start + 1,
      endLine: end,
      code,
      language: lang
    });
    if (end >= lines.length) break;
  }
  return chunks;
}
const STOP = /* @__PURE__ */ new Set(["the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by", "is", "are", "was", "were", "be", "been", "being", "this", "that", "these", "those", "it", "its", "i", "you", "he", "she", "we", "they", "them", "their", "my", "your", "do", "does", "did", "done", "have", "has", "had", "what", "which", "who", "whom", "where", "when", "why", "how", "can", "could", "should", "would", "will", "may", "about", "from", "into", "like", "just", "not", "no", "yes", "than", "then", "so"]);
function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 1 && !STOP.has(t));
}
function rankChunks(question, chunks) {
  const qTokens = new Set(tokenize(question));
  if (qTokens.size === 0) return chunks.slice(0, TOP_K_CHUNKS);
  const scored = chunks.map((c) => {
    const cTokens = tokenize(c.code + " " + c.path);
    let hits = 0;
    let pathBoost = 0;
    const pathTokens = tokenize(c.path);
    for (const t of cTokens) if (qTokens.has(t)) hits += 1;
    for (const t of pathTokens) if (qTokens.has(t)) pathBoost += 4;
    const score = hits / Math.sqrt(cTokens.length + 1) + pathBoost;
    return {
      c,
      score
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const seenPaths = /* @__PURE__ */ new Map();
  const picked = [];
  for (const {
    c,
    score
  } of scored) {
    if (score <= 0 && picked.length >= 4) break;
    const count = seenPaths.get(c.path) ?? 0;
    if (count >= 2) continue;
    seenPaths.set(c.path, count + 1);
    picked.push(c);
    if (picked.length >= TOP_K_CHUNKS) break;
  }
  if (picked.length === 0) return chunks.slice(0, TOP_K_CHUNKS);
  return picked;
}
function buildContext(snippets) {
  const parts = [];
  let total = 0;
  for (const s of snippets) {
    const block = `
--- ${s.path} (lines ${s.startLine}-${s.endLine}) ---
${s.code}
`;
    if (total + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    total += block.length;
  }
  return parts.join("");
}
const askRepo_createServerFn_handler = createServerRpc({
  id: "120c1a8b4f16ac0c68b94e939c07d0be9bea78b8396c4737ccc5333c39ebf788",
  name: "askRepo",
  filename: "src/api/repo.functions.ts"
}, (opts) => askRepo.__executeServer(opts));
const askRepo = createServerFn({
  method: "POST"
}).inputValidator((data) => InputSchema.parse(data)).handler(askRepo_createServerFn_handler, async ({
  data
}) => {
  const t0 = Date.now();
  const parsed = parseRepo(data.repo);
  if (!parsed) {
    return {
      ok: false,
      error: "Enter a repo as `owner/name` or a github.com URL."
    };
  }
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "AI gateway not configured."
    };
  }
  let branch = "main";
  let files;
  let totalBlobs = 0;
  let consideredFiles = 0;
  let usedCache = false;
  if (data.cachedFiles && data.cachedFiles.length > 0) {
    files = data.cachedFiles;
    consideredFiles = files.length;
    totalBlobs = files.length;
    usedCache = true;
  } else {
    try {
      const fetched = await fetchRepoFiles(parsed.owner, parsed.repo);
      branch = fetched.branch;
      files = fetched.files;
      totalBlobs = fetched.totalBlobs;
      consideredFiles = fetched.consideredFiles;
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to fetch repository."
      };
    }
  }
  if (files.length === 0) {
    return {
      ok: false,
      error: "No readable text files found in this repository."
    };
  }
  const fetchMs = Date.now() - t0;
  const allChunks = files.flatMap(chunkFile);
  const top = rankChunks(data.question, allChunks);
  const contextText = buildContext(top);
  const systemPrompt = `You are GitWhisper, an expert code analyst answering questions about a GitHub repository.

FORMAT YOUR ANSWERS WELL using GitHub-flavored markdown:
- Use clear headings (##, ###) when the answer has multiple sections.
- Use bullet/numbered lists for enumerations.
- Use fenced code blocks with language hints for code (\`\`\`ts ... \`\`\`).
- Use inline backticks for file paths, identifiers, and short code.
- Bold key terms.

CITATIONS:
- When you reference code, mention the file path inline in backticks (e.g., \`src/auth.ts\`).
- Be specific. Prefer concrete code references over vague descriptions.
- If the answer isn't in the provided context, say so honestly and suggest where to look.

Keep responses focused and information-dense.`;
  const repoLabel = `${parsed.owner}/${parsed.repo}`;
  const cachedNote = usedCache ? " (using cached index — no re-fetch)" : "";
  const userPrompt = `Repository: ${repoLabel} (branch: ${branch})${cachedNote}

Question: ${data.question}

Below are the most relevant code snippets retrieved by hybrid keyword + path ranking. Each is labeled with its file path and line range.

${contextText}`;
  const messages = [{
    role: "system",
    content: systemPrompt
  }, ...(data.history ?? []).map((m) => ({
    role: m.role,
    content: m.content
  })), {
    role: "user",
    content: userPrompt
  }];
  const aiStart = Date.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages
      })
    });
    if (res.status === 429) {
      return {
        ok: false,
        error: "Rate limit reached. Please try again in a moment."
      };
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("Groq API error:", res.status, t);
      return {
        ok: false,
        error: `Groq API error (${res.status}).`
      };
    }
    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content ?? "No response.";
    const aiMs = Date.now() - aiStart;
    const totalMs = Date.now() - t0;
    return {
      ok: true,
      answer,
      repo: repoLabel,
      branch,
      snippets: top,
      // Only return files when they came from a fresh fetch — to seed client cache.
      files: usedCache ? void 0 : files,
      stats: {
        totalBlobs,
        consideredFiles,
        indexedFiles: files.length,
        totalChunks: allChunks.length,
        retrievedChunks: top.length,
        fetchMs,
        aiMs,
        totalMs,
        usedCache
      }
    };
  } catch (e) {
    console.error("askRepo error:", e);
    return {
      ok: false,
      error: "Unexpected error contacting AI gateway."
    };
  }
});
export {
  askRepo_createServerFn_handler
};
