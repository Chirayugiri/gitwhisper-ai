import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askRepo, type Snippet } from "@/api/repo.functions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [
      { title: "Console — GitWhisper" },
      { name: "description", content: "Ask questions about any public GitHub repository." },
      { property: "og:title", content: "Console — GitWhisper" },
      { property: "og:description", content: "Ask questions about any public GitHub repository." },
    ],
  }),
  component: ConsolePage,
});

type Turn = {
  role: "user" | "assistant";
  content: string;
  snippets?: Snippet[];
  branch?: string;
  stats?: {
    totalBlobs: number;
    consideredFiles: number;
    indexedFiles: number;
    totalChunks: number;
    retrievedChunks: number;
    fetchMs: number;
    aiMs: number;
    totalMs: number;
    usedCache: boolean;
  };
  error?: boolean;
};

type CachedRepo = {
  repo: string;
  branch: string;
  files: { path: string; content: string }[];
  fetchedAt: number;
};

const SUGGESTIONS = [
  "What does this repo do?",
  "Explain the project structure.",
  "Where is authentication handled?",
  "Which dependencies does it use and why?",
];

const HISTORY_KEY = "gitwhisper.history.v2";
const CACHE_KEY = "gitwhisper.cache.v1";

function loadHistory(): Record<string, Turn[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveHistory(h: Record<string, Turn[]>) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {}
}
function loadCache(): Record<string, CachedRepo> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveCache(c: Record<string, CachedRepo>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // Quota exceeded — keep only the latest entry.
    try {
      const entries = Object.entries(c).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt);
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(0, 1))));
    } catch {}
  }
}

function normalizeRepo(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

type Phase =
  | { kind: "idle" }
  | { kind: "fetching"; startedAt: number; cached: boolean }
  | { kind: "retrieving"; startedAt: number }
  | { kind: "answering"; startedAt: number };

function ConsolePage() {
  const ask = useServerFn(askRepo);
  const [repoInput, setRepoInput] = useState("vercel/next.js");
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [allHistory, setAllHistory] = useState<Record<string, Turn[]>>({});
  const [cache, setCache] = useState<Record<string, CachedRepo>>({});
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [openSnippet, setOpenSnippet] = useState<Snippet | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const h = loadHistory();
    const c = loadCache();
    setAllHistory(h);
    setCache(c);
    // Restore the most recently used repo
    const mostRecent = Object.entries(c).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt)[0];
    if (mostRecent) {
      setActiveRepo(mostRecent[0]);
      setRepoInput(mostRecent[1].repo);
    }
  }, []);

  const turns = activeRepo ? allHistory[activeRepo] ?? [] : [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, phase.kind]);

  const updateTurns = useCallback(
    (key: string, updater: (prev: Turn[]) => Turn[]) => {
      setAllHistory((h) => {
        const next = { ...h, [key]: updater(h[key] ?? []) };
        saveHistory(next);
        return next;
      });
    },
    [],
  );

  const submit = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      const trimmedRepo = repoInput.trim();
      if (!trimmed || !trimmedRepo || phase.kind !== "idle") return;
      const key = normalizeRepo(trimmedRepo);
      const cached = cache[key];

      setQuestion("");
      setActiveRepo(key);
      updateTurns(key, (prev) => [...prev, { role: "user", content: trimmed }]);

      const t0 = Date.now();
      setPhase({ kind: cached ? "retrieving" : "fetching", startedAt: t0, cached: !!cached } as Phase);

      // Bump to "answering" once the network has been alive long enough
      // to suggest fetching/ranking finished. This is a UX heuristic.
      const answerTimer = window.setTimeout(() => {
        setPhase((p) => (p.kind === "idle" ? p : { kind: "answering", startedAt: Date.now() }));
      }, cached ? 400 : 1800);

      try {
        const recentHistory = (allHistory[key] ?? []).slice(-12).map((t) => ({
          role: t.role,
          content: t.content,
        }));
        const result = await ask({
          data: {
            repo: trimmedRepo,
            question: trimmed,
            history: recentHistory,
            cachedFiles: cached?.files,
          },
        });

        if (result.ok) {
          // Update cache when fresh files came back
          if (result.files) {
            setCache((c) => {
              const next = {
                ...c,
                [key]: {
                  repo: result.repo,
                  branch: result.branch,
                  files: result.files!,
                  fetchedAt: Date.now(),
                },
              };
              saveCache(next);
              return next;
            });
          }
          updateTurns(key, (prev) => [
            ...prev,
            {
              role: "assistant",
              content: result.answer,
              snippets: result.snippets,
              branch: result.branch,
              stats: result.stats,
            },
          ]);
        } else {
          updateTurns(key, (prev) => [
            ...prev,
            { role: "assistant", content: result.error, error: true },
          ]);
        }
      } catch {
        updateTurns(key, (prev) => [
          ...prev,
          { role: "assistant", content: "Unexpected error. Try again.", error: true },
        ]);
      } finally {
        window.clearTimeout(answerTimer);
        setPhase({ kind: "idle" });
      }
    },
    [repoInput, cache, allHistory, phase.kind, ask, updateTurns],
  );

  const clearConversation = () => {
    if (!activeRepo) return;
    if (!confirm("Clear conversation for this repo? Indexed files stay cached.")) return;
    updateTurns(activeRepo, () => []);
  };

  const cachedRepos = Object.values(cache).sort((a, b) => b.fetchedAt - a.fetchedAt);
  const activeCache = activeRepo ? cache[activeRepo] : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/60 px-6 md:px-10 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-primary rounded-sm relative overflow-hidden">
            <div className="absolute inset-1 border border-primary-foreground/40" />
          </div>
          <span className="text-lg font-bold tracking-tighter">GitWhisper</span>
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest ml-2">
            / console
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveRepo(null);
              setRepoInput("");
              setQuestion("");
            }}
            className="text-sm font-medium text-foreground hover:opacity-80 flex items-center gap-1.5"
          >
            <span className="text-lg leading-none mb-[2px]">+</span> New Chat
          </button>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </div>
      </header>

      {/* Repo input */}
      <div className="border-b border-border/60 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-wrap items-center gap-3">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Repo
          </div>
          <input
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="owner/name or github.com URL"
            className="flex-1 min-w-[240px] bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/60"
          />
          <span
            className={`font-mono text-[10px] uppercase tracking-widest ${
              activeCache ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {activeCache ? `● ${activeCache.files.length} files cached` : "○ idle"}
          </span>
          {turns.length > 0 && (
            <button
              onClick={clearConversation}
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar — recent repos */}
        {cachedRepos.length > 0 && (
          <aside className="hidden lg:block w-64 border-r border-border/60 bg-surface/50 overflow-y-auto">
            <div className="p-4">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                Recent repos
              </div>
              <ul className="space-y-1">
                {cachedRepos.map((c) => {
                  const k = normalizeRepo(c.repo);
                  const isActive = k === activeRepo;
                  const turnCount = (allHistory[k] ?? []).length;
                  return (
                    <li key={k}>
                      <button
                        onClick={() => {
                          setActiveRepo(k);
                          setRepoInput(c.repo);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-foreground text-background"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="font-mono text-xs truncate">{c.repo}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isActive ? "text-background/60" : "text-muted-foreground"
                          }`}
                        >
                          {turnCount} message{turnCount === 1 ? "" : "s"}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        )}

        {/* Conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-10">
              {turns.length === 0 && phase.kind === "idle" && (
                <div className="animate-slide-in">
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                    (00) Try a question
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-8 text-balance">
                    Ask anything about{" "}
                    <span className="font-mono text-primary text-2xl md:text-3xl">
                      {repoInput || "owner/name"}
                    </span>
                    .
                  </h1>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="text-left p-4 bg-surface border border-border rounded-xl hover:border-primary/60 hover:bg-background transition-colors"
                      >
                        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                          Prompt
                        </div>
                        <div className="text-sm">{s}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {turns.map((t, i) => (
                <TurnView
                  key={i}
                  turn={t}
                  repo={activeCache?.repo ?? repoInput}
                  branch={t.branch ?? activeCache?.branch ?? "main"}
                  onOpenSnippet={setOpenSnippet}
                />
              ))}

              {phase.kind !== "idle" && (
                <IndexingPanel
                  phase={phase}
                  cached={!!activeCache}
                  cachedCount={activeCache?.files.length ?? 0}
                />
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-border/60 bg-surface/50">
            <div className="max-w-3xl mx-auto px-6 md:px-10 py-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(question);
                }}
                className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3 focus-within:border-primary transition-colors"
              >
                <span className="font-mono text-primary">›</span>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    turns.length > 0
                      ? "Ask a follow-up…"
                      : "Ask about the architecture, files, or specific functions…"
                  }
                  disabled={phase.kind !== "idle"}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={phase.kind !== "idle" || !question.trim()}
                  className="bg-foreground text-background px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
                >
                  Run
                </button>
              </form>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-2 text-center">
                {activeCache
                  ? `Index cached · ${activeCache.files.length} files · follow-ups skip GitHub`
                  : "Powered by Lovable AI · Hybrid retrieval over GitHub"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Snippet sheet */}
      {openSnippet && (
        <SnippetSheet
          snippet={openSnippet}
          repo={activeCache?.repo ?? repoInput}
          branch={openSnippet ? activeCache?.branch ?? "main" : "main"}
          onClose={() => setOpenSnippet(null)}
        />
      )}
    </div>
  );
}

/* ---------- Indexing panel ---------- */

function IndexingPanel({
  phase,
  cached,
  cachedCount,
}: {
  phase: Phase;
  cached: boolean;
  cachedCount: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  if (phase.kind === "idle") return null;
  const elapsed = ((now - phase.startedAt) / 1000).toFixed(1);

  type Step = { id: Phase["kind"]; label: string; eta: string };
  const steps: Step[] = cached
    ? [
        { id: "retrieving", label: "Retrieving from cache", eta: "~0.5s" },
        { id: "answering", label: "Generating answer", eta: "~3–6s" },
      ]
    : [
        { id: "fetching", label: "Fetching repository tree & files", eta: "~3–8s" },
        { id: "retrieving", label: "Chunking & ranking", eta: "~1s" },
        { id: "answering", label: "Generating answer", eta: "~3–6s" },
      ];

  const activeIdx = steps.findIndex((s) => s.id === phase.kind);

  return (
    <div className="animate-slide-in border border-border bg-surface rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:120ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:240ms]" />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-foreground">
            Working
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {elapsed}s elapsed
        </span>
      </div>

      <ol className="space-y-3">
        {steps.map((s, i) => {
          const state =
            i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
          return (
            <li key={s.id} className="flex items-center gap-3">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  state === "done"
                    ? "bg-primary text-primary-foreground"
                    : state === "active"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={`flex-1 text-sm ${
                  state === "pending" ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {s.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {state === "active" ? "running" : s.eta}
              </span>
            </li>
          );
        })}
      </ol>

      {cached && (
        <div className="mt-4 pt-4 border-t border-border/60 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          Reusing {cachedCount} cached files — no GitHub round-trip
        </div>
      )}
    </div>
  );
}

/* ---------- Turn view ---------- */

function TurnView({
  turn,
  repo,
  branch,
  onOpenSnippet,
}: {
  turn: Turn;
  repo: string;
  branch: string;
  onOpenSnippet: (s: Snippet) => void;
}) {
  if (turn.role === "user") {
    return (
      <div className="animate-slide-in">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
          Query
        </div>
        <div className="text-lg font-medium text-foreground">{turn.content}</div>
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div
          className={`font-mono text-[10px] inline-block px-2 py-1 rounded uppercase tracking-widest ${
            turn.error
              ? "bg-destructive text-destructive-foreground"
              : "bg-foreground text-background"
          }`}
        >
          {turn.error ? "Error" : "Answer"}
        </div>
        {turn.branch && (
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            branch: {turn.branch}
          </span>
        )}
        {turn.stats && (
          <>
            <span className="font-mono text-[10px] text-muted-foreground">·</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              {turn.stats.retrievedChunks}/{turn.stats.totalChunks} chunks
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">·</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              {(turn.stats.totalMs / 1000).toFixed(1)}s
            </span>
            {turn.stats.usedCache && (
              <>
                <span className="font-mono text-[10px] text-muted-foreground">·</span>
                <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                  cached
                </span>
              </>
            )}
          </>
        )}
      </div>

      {turn.error ? (
        <div className="text-destructive">{turn.content}</div>
      ) : (
        <Markdown content={turn.content} />
      )}

      {turn.snippets && turn.snippets.length > 0 && (
        <div className="mt-6 pt-5 border-t border-border/60">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
            Citations · {turn.snippets.length} snippet{turn.snippets.length === 1 ? "" : "s"}
          </div>
          <div className="space-y-2">
            {turn.snippets.map((s, i) => (
              <CitationCard
                key={i}
                snippet={s}
                repo={repo}
                branch={branch}
                onOpen={() => onOpenSnippet(s)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Citation card ---------- */

function CitationCard({
  snippet,
  repo,
  branch,
  onOpen,
}: {
  snippet: Snippet;
  repo: string;
  branch: string;
  onOpen: () => void;
}) {
  const ghUrl = `https://github.com/${repo}/blob/${branch}/${snippet.path}#L${snippet.startLine}-L${snippet.endLine}`;
  const previewLines = snippet.code.split("\n").slice(0, 3).join("\n");

  return (
    <div className="border border-border bg-surface rounded-xl overflow-hidden hover:border-primary/60 transition-colors">
      <button
        onClick={onOpen}
        className="w-full text-left p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
      >
        <div className="font-mono text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded uppercase tracking-widest shrink-0 mt-0.5">
          L{snippet.startLine}–{snippet.endLine}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-foreground truncate">{snippet.path}</div>
          <pre className="font-mono text-[11px] text-muted-foreground mt-1 truncate whitespace-pre overflow-hidden">
            {previewLines.split("\n")[0]?.trim().slice(0, 100) || "…"}
          </pre>
        </div>
        <span className="font-mono text-[10px] text-primary uppercase tracking-widest shrink-0">
          View →
        </span>
      </button>
      <div className="border-t border-border/60 px-3 py-1.5 flex items-center justify-between bg-background/40">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          {snippet.language}
        </span>
        <a
          href={ghUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest"
        >
          Open on GitHub ↗
        </a>
      </div>
    </div>
  );
}

/* ---------- Snippet sheet ---------- */

function SnippetSheet({
  snippet,
  repo,
  branch,
  onClose,
}: {
  snippet: Snippet;
  repo: string;
  branch: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ghUrl = `https://github.com/${repo}/blob/${branch}/${snippet.path}#L${snippet.startLine}-L${snippet.endLine}`;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-foreground/30 backdrop-blur-sm"
      />
      <div className="w-full max-w-2xl bg-background border-l border-border shadow-2xl flex flex-col animate-slide-in">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
              Snippet · L{snippet.startLine}–{snippet.endLine}
            </div>
            <div className="font-mono text-sm text-foreground truncate">{snippet.path}</div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest shrink-0"
          >
            Close ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <SyntaxHighlighter
            language={snippet.language}
            style={oneLight}
            showLineNumbers
            startingLineNumber={snippet.startLine}
            customStyle={{
              margin: 0,
              padding: "1.25rem",
              background: "transparent",
              fontSize: "12.5px",
              lineHeight: "1.55",
            }}
            lineNumberStyle={{
              color: "var(--color-muted-foreground)",
              opacity: 0.5,
              paddingRight: "1rem",
              userSelect: "none",
            }}
          >
            {snippet.code}
          </SyntaxHighlighter>
        </div>
        <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-surface">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {snippet.language}
          </span>
          <a
            href={ghUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] text-primary hover:underline uppercase tracking-widest"
          >
            Open on GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
}

/* ---------- Markdown rendering (Claude/ChatGPT style) ---------- */

function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-7 text-foreground space-y-4 [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight mt-6 mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold tracking-tight mt-6 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold tracking-tight mt-5 mb-2">{children}</h3>
          ),
          p: ({ children }) => <p className="leading-7">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-1.5 marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-1.5 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border my-6" />,
          table: ({ children }) => (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left px-3 py-2 font-semibold border-b border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border/60">{children}</td>
          ),
          code: ({ className, children, ...props }) => {
            const inline = !(props as { node?: { position?: { start: { line: number }; end: { line: number } } } }).node ||
              !className;
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            if (inline && !match) {
              return (
                <code className="font-mono text-[0.85em] bg-muted text-foreground px-1.5 py-0.5 rounded border border-border">
                  {children}
                </code>
              );
            }
            return (
              <div className="my-2 rounded-lg overflow-hidden border border-border">
                {match && (
                  <div className="bg-muted px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                    {match[1]}
                  </div>
                )}
                <SyntaxHighlighter
                  language={match?.[1] ?? "text"}
                  style={oneLight}
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    background: "transparent",
                    fontSize: "12.5px",
                    lineHeight: "1.55",
                  }}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
