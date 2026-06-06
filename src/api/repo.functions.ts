import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pipeline, cos_sim, env } from '@xenova/transformers';
import { QdrantClient } from '@qdrant/js-client-rest';
// @ts-ignore
import bm25 from 'wink-bm25-text-search';
// @ts-ignore
import winkNLP from 'wink-nlp';
// @ts-ignore
import model from 'wink-eng-lite-web-model';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Parser: any = require('web-tree-sitter');

// Ensure transformers doesn't try to access local FS cache in production edge/serverless.
env.allowLocalModels = false;

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
const TOP_K_CHUNKS = 12;
const MAX_CONTEXT_CHARS = 80_000;
const THRESHOLD = 0.65;
const MIN_RESULTS_FALLBACK = 3;

export type Snippet = {
  id?: string;
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
});

type GhTreeItem = { path: string; type: string; size?: number };

function parseRepo(input: string): { owner: string; repo: string } | null {
  let cleaned = input.trim();
  
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned);
      if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
        return null;
      }
      cleaned = url.pathname.slice(1);
    } catch {
      return null;
    }
  }
  
  cleaned = cleaned.replace(/\.git$/, "").replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  
  if (parts.length < 2) return null;
  
  const owner = parts[0];
  const repo = parts[1];
  
  if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
    return null;
  }
  
  return { owner, repo };
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
  return fetch(url, { headers, cache: "no-store" });
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

// ============================================================================
// 1. AST-Based Chunking
// ============================================================================
let parser: any = null;
let tsLang: any = null;

async function initParser() {
  if (!parser) {
    // @ts-ignore
    await Parser.init();
    // @ts-ignore
    parser = new Parser();
    tsLang = await Parser.Language.load('https://unpkg.com/tree-sitter-wasms@0.1.11/out/tree-sitter-typescript.wasm');
    parser.setLanguage(tsLang);
  }
  return parser;
}

function fallbackChunk(file: { path: string; content: string }): Snippet[] {
  const CHUNK_LINES = 60;
  const CHUNK_OVERLAP = 10;
  const lines = file.content.split("\n");
  const chunks: Snippet[] = [];
  if (lines.length === 0) return chunks;
  const lang = languageOf(file.path);
  for (let start = 0; start < lines.length; start += CHUNK_LINES - CHUNK_OVERLAP) {
    const end = Math.min(start + CHUNK_LINES, lines.length);
    const code = lines.slice(start, end).join("\n");
    if (code.trim().length === 0) continue;
    chunks.push({
      id: `${file.path}-${start}`,
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

async function chunkFileAST(file: { path: string; content: string }): Promise<Snippet[]> {
  const lang = languageOf(file.path);
  if (!['typescript', 'tsx', 'javascript', 'jsx'].includes(lang)) {
    return fallbackChunk(file);
  }
  
  try {
    const p = await initParser();
    const tree = p.parse(file.content);
    const chunks: Snippet[] = [];
    
    function traverse(node: any) {
      if (['function_declaration', 'class_declaration', 'method_definition', 'interface_declaration', 'type_alias_declaration'].includes(node.type)) {
        if (node.text.length > 30) {
          chunks.push({
            id: `${file.path}-${node.startPosition.row}`,
            path: file.path,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            code: node.text,
            language: lang
          });
        }
      } else {
        for (let i = 0; i < node.childCount; i++) {
          traverse(node.child(i)!);
        }
      }
    }
    
    traverse(tree.rootNode);
    if (chunks.length === 0) return fallbackChunk(file);
    return chunks;
  } catch (e) {
    console.error("AST chunking failed:", e);
    return fallbackChunk(file);
  }
}

// ============================================================================
// Semantic & Reranker Pipelines (Lazy loaded)
// ============================================================================
let extractorPipeline: any = null;
let crossEncoderPipeline: any = null;

async function getExtractor() {
  if (!extractorPipeline) {
    extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
  }
  return extractorPipeline;
}

async function getReranker() {
  if (!crossEncoderPipeline) {
    crossEncoderPipeline = await pipeline('text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2', { quantized: true });
  }
  return crossEncoderPipeline;
}

// ============================================================================
// Context Builder
// ============================================================================
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

export const ingestRepo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ repo: z.string().min(3).max(140) }).parse(data))
  .handler(async ({ data }) => {
    const parsed = parseRepo(data.repo);
    if (!parsed) {
      return { ok: false as const, error: "Enter a repo as `owner/name` or a github.com URL." };
    }
    const collectionName = `repo_${parsed.owner}_${parsed.repo}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().substring(0, 255);
    
    const qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });

    let collectionExists = false;
    try {
      const collections = await qdrant.getCollections();
      collectionExists = collections.collections.some((c: any) => c.name === collectionName);
    } catch (e) {
      console.warn("Could not fetch Qdrant collections", e);
    }

    if (collectionExists) {
      return { ok: true as const, message: "Repository already indexed", cached: true };
    }

    try {
      const fetched = await fetchRepoFiles(parsed.owner, parsed.repo);
      if (fetched.files.length === 0) {
        return { ok: false as const, error: "No readable text files found." };
      }
      
      const allChunks: Snippet[] = [];
      for (const file of fetched.files) {
        allChunks.push(...(await chunkFileAST(file)));
      }
      if (allChunks.length === 0) {
        return { ok: false as const, error: "No code chunks could be extracted." };
      }

      await qdrant.createCollection(collectionName, { vectors: { size: 384, distance: 'Cosine' } });
      const extract = await getExtractor();
      const BATCH_SIZE = 50;
      for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
        const batch = allChunks.slice(i, i + BATCH_SIZE);
        const batchCodes = batch.map(c => c.code);
        const out = await extract(batchCodes, { pooling: 'mean', normalize: true });
        const vectors = out.tolist();
        const points = batch.map((chunk, idx) => ({
          id: crypto.randomUUID(),
          vector: Array.from(vectors[idx] as number[]),
          payload: chunk as any
        }));
        await qdrant.upsert(collectionName, { points });
      }
      return { ok: true as const, message: "Repository indexed successfully", cached: false, files: fetched.files, branch: fetched.branch };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Ingestion failed" };
    }
  });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

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

    let branch = "main";
    let files: { path: string; content: string }[] = [];
    let totalBlobs = 0;
    let consideredFiles = 0;
    let usedCache = false;
    let totalChunks = 0;

    const collectionName = `repo_${parsed.owner}_${parsed.repo}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().substring(0, 255);

    let collectionExists = false;
    try {
      const collections = await qdrant.getCollections();
      collectionExists = collections.collections.some((c: any) => c.name === collectionName);
    } catch (e) {
      console.warn("Could not fetch Qdrant collections", e);
    }

    const extract = await getExtractor();

    if (!collectionExists) {
      try {
        const fetched = await fetchRepoFiles(parsed.owner, parsed.repo);
        branch = fetched.branch;
        files = fetched.files;
        totalBlobs = fetched.totalBlobs;
        consideredFiles = fetched.consideredFiles;
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Failed to fetch repository." };
      }

      if (files.length === 0) {
        return { ok: false as const, error: "No readable text files found in this repository." };
      }

      const allChunks: Snippet[] = [];
      for (const file of files) {
        allChunks.push(...(await chunkFileAST(file)));
      }
      
      if (allChunks.length === 0) {
        return { ok: false as const, error: "No code chunks could be extracted." };
      }

      totalChunks = allChunks.length;

      try {
        await qdrant.createCollection(collectionName, {
          vectors: { size: 384, distance: 'Cosine' }
        });
        
        const BATCH_SIZE = 50;
        for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
          const batch = allChunks.slice(i, i + BATCH_SIZE);
          const batchCodes = batch.map(c => c.code);
          const out = await extract(batchCodes, { pooling: 'mean', normalize: true });
          const vectors = out.tolist();
          const points = batch.map((chunk, idx) => ({
            id: crypto.randomUUID(),
            vector: Array.from(vectors[idx] as number[]),
            payload: chunk as any
          }));
          await qdrant.upsert(collectionName, { points });
        }
      } catch (e) {
        console.error("Failed to ingest to Qdrant:", e);
        return { ok: false as const, error: "Failed to store data in vector database." };
      }
    } else {
      usedCache = true;
    }

    const fetchMs = Date.now() - t0;

    // Search Phase using Qdrant
    const queryEmbOut = await extract(data.question, { pooling: 'mean', normalize: true });
    const queryEmb = Array.from(queryEmbOut.tolist()[0] as number[]);

    const searchRes = await qdrant.search(collectionName, {
      vector: queryEmb,
      limit: 20
    });

    const topHybrid = searchRes.map((p: any) => p.payload as Snippet);

    // 5. Re-ranking (CrossEntropy)
    const rerank = await getReranker();
    const rerankedResults = [];
    for (const chunk of topHybrid) {
      const out = await rerank(data.question, { text_pair: chunk.code });
      const score = Array.isArray(out) ? out[0].score : out.score;
      rerankedResults.push({ chunk, score });
    }
    
    rerankedResults.sort((a, b) => b.score - a.score);

    // 6. Thresholding with Minimum 3 results fallback
    let finalChunks = rerankedResults.filter(r => r.score >= THRESHOLD).map(r => r.chunk);
    if (finalChunks.length < MIN_RESULTS_FALLBACK) {
      finalChunks = rerankedResults.slice(0, MIN_RESULTS_FALLBACK).map(r => r.chunk);
    }
    
    const top = finalChunks.slice(0, TOP_K_CHUNKS);
    console.log("Retrieved documents to ans the question:", top.map(c => `${c.path} (L${c.startLine}-${c.endLine})`));
    const contextText = buildContext(top);

    // 7. LLM Generation
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

Below are the most relevant code snippets retrieved using a semantic hybrid AST-chunking pipeline. Each is labeled with its file path and line range.

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
        files: usedCache ? undefined : files,
        stats: {
          totalBlobs,
          consideredFiles,
          indexedFiles: files.length,
          totalChunks: usedCache ? -1 : totalChunks,
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
