import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "rb", "go", "rs", "java", "kt", "swift", "c", "h", "cpp", "hpp", "cs",
  "php", "sh", "bash", "zsh",
  "json", "yaml", "yml", "toml", "md", "mdx", "txt",
  "html", "css", "scss", "sass", "vue", "svelte", "astro",
  "sql", "graphql", "gql",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt", "out",
  ".turbo", ".cache", "coverage", ".vercel", ".vite", "vendor", "target",
  "__pycache__", ".pytest_cache", ".venv", "venv",
]);

const MAX_FILES = 60;
const MAX_FILE_BYTES = 30_000;
const CHUNK_LINES = 60;
const CHUNK_OVERLAP = 10;
const TOP_K_CHUNKS = 12;
const MAX_CONTEXT_CHARS = 80_000;

export type Snippet = {
  path: string;
  startLine: number;
  endLine: number;
  code: string;
  language: string;
};

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const InputSchema = z.object({
  repo: z.string().min(3).max(140),
  question: z.string().min(2).max(2000),
  history: z.array(MessageSchema).max(40).optional().default([]),
  // If the client already has the index, it can pass cached files to skip GitHub fetch.
  cachedFiles: z
    .array(z.object({ path: z.string(), content: z.string() }))
    .max(MAX_FILES * 2)
    .optional(),
});

type GhTreeItem = { path: string; type: string; size?: number };

function parseRepo(input: string): { owner: string; repo: string } | null {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

function ext(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}

function languageOf(path: string): string {
  const e = ext(path);
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    kt: "kotlin", swift: "swift", c: "c", h: "c", cpp: "cpp", hpp: "cpp",
    cs: "csharp", php: "php", sh: "bash", bash: "bash", zsh: "bash",
    json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", mdx: "markdown", html: "html",
    css: "css", scss: "scss", sass: "sass",
    vue: "vue", svelte: "svelte", astro: "astro",
    sql: "sql", graphql: "graphql", gql: "graphql",
  };
  return map[e] ?? "text";
}

function fileScore(path: string): number {
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

function shouldSkip(path: string): boolean {
  return path.split("/").some((p) => SKIP_DIRS.has(p));
}

async function ghFetch(url: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GitWhisper/0.1",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers });
}

async function fetchRepoFiles(owner: string, repo: string) {
  const token = process.env.GITHUB_TOKEN;
  const repoRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, token);
  if (!repoRes.ok) {
    if (repoRes.status === 404) throw new Error("Repository not found. Make sure it's public and the owner/name is correct.");
    if (repoRes.status === 403) throw new Error("GitHub rate limit hit. Try again in a minute.");
    throw new Error(`GitHub error: ${repoRes.status}`);
  }
  const repoData = (await repoRes.json()) as { default_branch: string };
  const branch = repoData.default_branch;

  const treeRes = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token,
  );
  if (!treeRes.ok) throw new Error(`Failed to load repo tree: ${treeRes.status}`);
  const treeData = (await treeRes.json()) as { tree: GhTreeItem[]; truncated?: boolean };

  const totalBlobs = treeData.tree.filter((i) => i.type === "blob").length;

  const candidates = treeData.tree
    .filter((i) => i.type === "blob" && !shouldSkip(i.path))
    .filter((i) => TEXT_EXTENSIONS.has(ext(i.path)))
    .filter((i) => (i.size ?? 0) < MAX_FILE_BYTES * 2)
    .map((i) => ({ ...i, _score: fileScore(i.path) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, MAX_FILES);

  const files = await Promise.all(
    candidates.map(async (c) => {
      try {
        const r = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${c.path}`,
          { headers: { "User-Agent": "GitWhisper/0.1" } },
        );
        if (!r.ok) return null;
        const text = await r.text();
        return { path: c.path, content: text.slice(0, MAX_FILE_BYTES) };
      } catch {
        return null;
      }
    }),
  );

  return {
    branch,
    totalBlobs,
    consideredFiles: candidates.length,
    files: files.filter((f): f is { path: string; content: string } => !!f),
  };
}

// Split a file into overlapping line-windowed chunks
function chunkFile(file: { path: string; content: string }): Snippet[] {
  const lines = file.content.split("\n");
  const chunks: Snippet[] = [];
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
      language: lang,
    });
    if (end >= lines.length) break;
  }
  return chunks;
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "being", "this", "that", "these", "those",
  "it", "its", "i", "you", "he", "she", "we", "they", "them", "their", "my", "your",
  "do", "does", "did", "done", "have", "has", "had", "what", "which", "who", "whom",
  "where", "when", "why", "how", "can", "could", "should", "would", "will", "may",
  "about", "from", "into", "like", "just", "not", "no", "yes", "than", "then", "so",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function rankChunks(question: string, chunks: Snippet[]): Snippet[] {
  const qTokens = new Set(tokenize(question));
  if (qTokens.size === 0) return chunks.slice(0, TOP_K_CHUNKS);

  const scored = chunks.map((c) => {
    const cTokens = tokenize(c.code + " " + c.path);
    let hits = 0;
    let pathBoost = 0;
    const pathTokens = tokenize(c.path);
    for (const t of cTokens) if (qTokens.has(t)) hits += 1;
    for (const t of pathTokens) if (qTokens.has(t)) pathBoost += 4;
    // tf-idf-ish: longer chunks shouldn't dominate
    const score = hits / Math.sqrt(cTokens.length + 1) + pathBoost;
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // ensure path diversity in top-k
  const seenPaths = new Map<string, number>();
  const picked: Snippet[] = [];
  for (const { c, score } of scored) {
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

function buildContext(snippets: Snippet[]): string {
  const parts: string[] = [];
  let total = 0;
  for (const s of snippets) {
    const block = `\n--- ${s.path} (lines ${s.startLine}-${s.endLine}) ---\n${s.code}\n`;
    if (total + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    total += block.length;
  }
  return parts.join("");
}

export const askRepo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const t0 = Date.now();
    const parsed = parseRepo(data.repo);
    if (!parsed) {
      return { ok: false as const, error: "Enter a repo as `owner/name` or a github.com URL." };
    }

    const apiKey = process.env.LLM_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false as const, error: "AI gateway not configured." };
    }

    // Safe debug log for the developer console
    console.log(`[Groq] Using API key: ${apiKey.slice(0, 7)}...${apiKey.slice(-4)} (length: ${apiKey.length})`);

    let branch = "main";
    let files: { path: string; content: string }[];
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
        return { ok: false as const, error: e instanceof Error ? e.message : "Failed to fetch repository." };
      }
    }

    if (files.length === 0) {
      return { ok: false as const, error: "No readable text files found in this repository." };
    }

    const fetchMs = Date.now() - t0;

    // Chunk + rank
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

    const messages = [
      { role: "system", content: systemPrompt },
      ...(data.history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userPrompt },
    ];

    const aiStart = Date.now();
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "Rate limit reached. Please try again in a moment." };
      }
      if (!res.ok) {
        const t = await res.text();
        console.error("Groq API error:", res.status, t);
        return { ok: false as const, error: `Groq API error (${res.status}).` };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const answer = json.choices?.[0]?.message?.content ?? "No response.";
      const aiMs = Date.now() - aiStart;
      const totalMs = Date.now() - t0;

      return {
        ok: true as const,
        answer,
        repo: repoLabel,
        branch,
        snippets: top,
        // Only return files when they came from a fresh fetch — to seed client cache.
        files: usedCache ? undefined : files,
        stats: {
          totalBlobs,
          consideredFiles,
          indexedFiles: files.length,
          totalChunks: allChunks.length,
          retrievedChunks: top.length,
          fetchMs,
          aiMs,
          totalMs,
          usedCache,
        },
      };
    } catch (e) {
      console.error("askRepo error:", e);
      return { ok: false as const, error: "Unexpected error contacting AI gateway." };
    }
  });
