import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link, u as useRouter } from "../_libs/tanstack__react-router.mjs";
import { l as isRedirect } from "../_libs/tanstack__router-core.mjs";
import { c as createServerFn, T as TSS_SERVER_FUNCTION, g as getServerFnById } from "./index.mjs";
import "../_libs/seroval.mjs";
import { h as highlighter, o as oneLight } from "../_libs/react-syntax-highlighter.mjs";
import { M as Markdown$1 } from "../_libs/react-markdown.mjs";
import { r as remarkGfm } from "../_libs/remark-gfm.mjs";
import { o as objectType, a as arrayType, s as stringType, e as enumType } from "../_libs/zod.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "node:stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/babel__runtime.mjs";
import "../_libs/refractor.mjs";
import "../_libs/hastscript.mjs";
import "../_libs/property-information.mjs";
import "../_libs/comma-separated-tokens.mjs";
import "../_libs/space-separated-tokens.mjs";
import "../_libs/hast-util-parse-selector.mjs";
import "../_libs/parse-entities.mjs";
import "../_libs/character-entities-legacy.mjs";
import "../_libs/character-reference-invalid.mjs";
import "../_libs/is-decimal.mjs";
import "../_libs/is-hexadecimal.mjs";
import "../_libs/is-alphanumerical.mjs";
import "../_libs/is-alphabetical.mjs";
import "../_libs/decode-named-character-reference+[...].mjs";
import "../_libs/character-entities.mjs";
import "../_libs/devlop.mjs";
import "../_libs/unified.mjs";
import "../_libs/bail.mjs";
import "../_libs/extend.mjs";
import "../_libs/is-plain-obj.mjs";
import "../_libs/trough.mjs";
import "../_libs/vfile.mjs";
import "../_libs/vfile-message.mjs";
import "../_libs/unist-util-stringify-position.mjs";
import "node:process";
import "node:path";
import "node:url";
import "../_libs/remark-parse.mjs";
import "../_libs/mdast-util-from-markdown.mjs";
import "../_libs/micromark-util-decode-numeric-character-reference+[...].mjs";
import "../_libs/micromark-util-decode-string.mjs";
import "../_libs/micromark-util-normalize-identifier+[...].mjs";
import "../_libs/micromark.mjs";
import "../_libs/micromark-util-combine-extensions+[...].mjs";
import "../_libs/micromark-util-chunked.mjs";
import "../_libs/micromark-factory-space.mjs";
import "../_libs/micromark-util-character.mjs";
import "../_libs/micromark-core-commonmark.mjs";
import "../_libs/micromark-util-classify-character+[...].mjs";
import "../_libs/micromark-util-resolve-all.mjs";
import "../_libs/micromark-util-subtokenize.mjs";
import "../_libs/micromark-factory-destination.mjs";
import "../_libs/micromark-factory-label.mjs";
import "../_libs/micromark-factory-title.mjs";
import "../_libs/micromark-factory-whitespace.mjs";
import "../_libs/micromark-util-html-tag-name.mjs";
import "../_libs/mdast-util-to-string.mjs";
import "../_libs/remark-rehype.mjs";
import "../_libs/mdast-util-to-hast.mjs";
import "../_libs/ungap__structured-clone.mjs";
import "../_libs/micromark-util-sanitize-uri.mjs";
import "../_libs/unist-util-position.mjs";
import "../_libs/trim-lines.mjs";
import "../_libs/unist-util-visit.mjs";
import "../_libs/unist-util-visit-parents.mjs";
import "../_libs/unist-util-is.mjs";
import "../_libs/hast-util-to-jsx-runtime.mjs";
import "../_libs/style-to-js.mjs";
import "../_libs/style-to-object.mjs";
import "../_libs/inline-style-parser.mjs";
import "../_libs/hast-util-whitespace.mjs";
import "../_libs/estree-util-is-identifier-name.mjs";
import "../_libs/html-url-attributes.mjs";
import "../_libs/micromark-extension-gfm.mjs";
import "../_libs/micromark-extension-gfm-autolink-literal+[...].mjs";
import "../_libs/micromark-extension-gfm-footnote+[...].mjs";
import "../_libs/micromark-extension-gfm-strikethrough+[...].mjs";
import "../_libs/micromark-extension-gfm-table.mjs";
import "../_libs/micromark-extension-gfm-task-list-item+[...].mjs";
import "../_libs/mdast-util-gfm.mjs";
import "../_libs/mdast-util-gfm-autolink-literal+[...].mjs";
import "../_libs/ccount.mjs";
import "../_libs/mdast-util-find-and-replace.mjs";
import "../_libs/escape-string-regexp.mjs";
import "../_libs/mdast-util-gfm-footnote.mjs";
import "../_libs/mdast-util-gfm-strikethrough.mjs";
import "../_libs/mdast-util-gfm-table.mjs";
import "../_libs/markdown-table.mjs";
import "../_libs/mdast-util-to-markdown.mjs";
import "../_libs/longest-streak.mjs";
import "../_libs/mdast-util-phrasing.mjs";
import "../_libs/mdast-util-gfm-task-list-item.mjs";
function useServerFn(serverFn) {
  const router = useRouter();
  return reactExports.useCallback(async (...args) => {
    try {
      const res = await serverFn(...args);
      if (isRedirect(res)) throw res;
      return res;
    } catch (err) {
      if (isRedirect(err)) {
        err.options._fromLocation = router.stores.location.get();
        return router.navigate(router.resolveRedirect(err).options);
      }
      throw err;
    }
  }, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const MAX_FILES = 60;
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
const askRepo = createServerFn({
  method: "POST"
}).inputValidator((data) => InputSchema.parse(data)).handler(createSsrRpc("120c1a8b4f16ac0c68b94e939c07d0be9bea78b8396c4737ccc5333c39ebf788"));
const SUGGESTIONS = ["What does this repo do?", "Explain the project structure.", "Where is authentication handled?", "Which dependencies does it use and why?"];
const HISTORY_KEY = "gitwhisper.history.v2";
const CACHE_KEY = "gitwhisper.cache.v1";
function loadHistory() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveHistory(h) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
  }
}
function loadCache() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveCache(c) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    try {
      const entries = Object.entries(c).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt);
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(0, 1))));
    } catch {
    }
  }
}
function normalizeRepo(input) {
  return input.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\.git$/, "").replace(/\/+$/, "").toLowerCase();
}
function ConsolePage() {
  const ask = useServerFn(askRepo);
  const [repoInput, setRepoInput] = reactExports.useState("vercel/next.js");
  const [activeRepo, setActiveRepo] = reactExports.useState(null);
  const [question, setQuestion] = reactExports.useState("");
  const [allHistory, setAllHistory] = reactExports.useState({});
  const [cache, setCache] = reactExports.useState({});
  const [phase, setPhase] = reactExports.useState({
    kind: "idle"
  });
  const [openSnippet, setOpenSnippet] = reactExports.useState(null);
  const scrollRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const h = loadHistory();
    const c = loadCache();
    setAllHistory(h);
    setCache(c);
    const mostRecent = Object.entries(c).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt)[0];
    if (mostRecent) {
      setActiveRepo(mostRecent[0]);
      setRepoInput(mostRecent[1].repo);
    }
  }, []);
  const turns = activeRepo ? allHistory[activeRepo] ?? [] : [];
  reactExports.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [turns.length, phase.kind]);
  const updateTurns = reactExports.useCallback((key, updater) => {
    setAllHistory((h) => {
      const next = {
        ...h,
        [key]: updater(h[key] ?? [])
      };
      saveHistory(next);
      return next;
    });
  }, []);
  const submit = reactExports.useCallback(async (q) => {
    const trimmed = q.trim();
    const trimmedRepo = repoInput.trim();
    if (!trimmed || !trimmedRepo || phase.kind !== "idle") return;
    const key = normalizeRepo(trimmedRepo);
    const cached = cache[key];
    setQuestion("");
    setActiveRepo(key);
    updateTurns(key, (prev) => [...prev, {
      role: "user",
      content: trimmed
    }]);
    const t0 = Date.now();
    setPhase({
      kind: cached ? "retrieving" : "fetching",
      startedAt: t0,
      cached: !!cached
    });
    const answerTimer = window.setTimeout(() => {
      setPhase((p) => p.kind === "idle" ? p : {
        kind: "answering",
        startedAt: Date.now()
      });
    }, cached ? 400 : 1800);
    try {
      const recentHistory = (allHistory[key] ?? []).slice(-12).map((t) => ({
        role: t.role,
        content: t.content
      }));
      const result = await ask({
        data: {
          repo: trimmedRepo,
          question: trimmed,
          history: recentHistory,
          cachedFiles: cached?.files
        }
      });
      if (result.ok) {
        if (result.files) {
          setCache((c) => {
            const next = {
              ...c,
              [key]: {
                repo: result.repo,
                branch: result.branch,
                files: result.files,
                fetchedAt: Date.now()
              }
            };
            saveCache(next);
            return next;
          });
        }
        updateTurns(key, (prev) => [...prev, {
          role: "assistant",
          content: result.answer,
          snippets: result.snippets,
          branch: result.branch,
          stats: result.stats
        }]);
      } else {
        updateTurns(key, (prev) => [...prev, {
          role: "assistant",
          content: result.error,
          error: true
        }]);
      }
    } catch {
      updateTurns(key, (prev) => [...prev, {
        role: "assistant",
        content: "Unexpected error. Try again.",
        error: true
      }]);
    } finally {
      window.clearTimeout(answerTimer);
      setPhase({
        kind: "idle"
      });
    }
  }, [repoInput, cache, allHistory, phase.kind, ask, updateTurns]);
  const clearConversation = () => {
    if (!activeRepo) return;
    if (!confirm("Clear conversation for this repo? Indexed files stay cached.")) return;
    updateTurns(activeRepo, () => []);
  };
  const cachedRepos = Object.values(cache).sort((a, b) => b.fetchedAt - a.fetchedAt);
  const activeCache = activeRepo ? cache[activeRepo] : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background text-foreground flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "border-b border-border/60 px-6 md:px-10 py-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", className: "flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 bg-primary rounded-sm relative overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-1 border border-primary-foreground/40" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-bold tracking-tighter", children: "GitWhisper" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest ml-2", children: "/ console" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          setActiveRepo(null);
          setRepoInput("");
          setQuestion("");
        }, className: "text-sm font-medium text-foreground hover:opacity-80 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg leading-none mb-[2px]", children: "+" }),
          " New Chat"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", className: "text-sm font-medium text-muted-foreground hover:text-foreground", children: "← Back" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border/60 bg-muted/30", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-wrap items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: "Repo" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: repoInput, onChange: (e) => setRepoInput(e.target.value), placeholder: "owner/name or github.com URL", className: "flex-1 min-w-[240px] bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/60" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `font-mono text-[10px] uppercase tracking-widest ${activeCache ? "text-primary" : "text-muted-foreground"}`, children: activeCache ? `● ${activeCache.files.length} files cached` : "○ idle" }),
      turns.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: clearConversation, className: "font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors", children: "Clear chat" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex min-h-0", children: [
      cachedRepos.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "hidden lg:block w-64 border-r border-border/60 bg-surface/50 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3", children: "Recent repos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1", children: cachedRepos.map((c) => {
          const k = normalizeRepo(c.repo);
          const isActive = k === activeRepo;
          const turnCount = (allHistory[k] ?? []).length;
          return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            setActiveRepo(k);
            setRepoInput(c.repo);
          }, className: `w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? "bg-foreground text-background" : "hover:bg-muted text-foreground"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-xs truncate", children: c.repo }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `text-[10px] mt-0.5 ${isActive ? "text-background/60" : "text-muted-foreground"}`, children: [
              turnCount,
              " message",
              turnCount === 1 ? "" : "s"
            ] })
          ] }) }, k);
        }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-10", children: [
          turns.length === 0 && phase.kind === "idle" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-slide-in", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3", children: "(00) Try a question" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-3xl md:text-4xl font-bold tracking-tighter mb-8 text-balance", children: [
              "Ask anything about",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-primary text-2xl md:text-3xl", children: repoInput || "owner/name" }),
              "."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: SUGGESTIONS.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => submit(s), className: "text-left p-4 bg-surface border border-border rounded-xl hover:border-primary/60 hover:bg-background transition-colors", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1", children: "Prompt" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: s })
            ] }, s)) })
          ] }),
          turns.map((t, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(TurnView, { turn: t, repo: activeCache?.repo ?? repoInput, branch: t.branch ?? activeCache?.branch ?? "main", onOpenSnippet: setOpenSnippet }, i)),
          phase.kind !== "idle" && /* @__PURE__ */ jsxRuntimeExports.jsx(IndexingPanel, { phase, cached: !!activeCache, cachedCount: activeCache?.files.length ?? 0 })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/60 bg-surface/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl mx-auto px-6 md:px-10 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: (e) => {
            e.preventDefault();
            submit(question);
          }, className: "flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3 focus-within:border-primary transition-colors", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-primary", children: "›" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: question, onChange: (e) => setQuestion(e.target.value), placeholder: turns.length > 0 ? "Ask a follow-up…" : "Ask about the architecture, files, or specific functions…", disabled: phase.kind !== "idle", className: "flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 disabled:opacity-50" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: phase.kind !== "idle" || !question.trim(), className: "bg-foreground text-background px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors", children: "Run" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-2 text-center", children: activeCache ? `Index cached · ${activeCache.files.length} files · follow-ups skip GitHub` : "Powered by Lovable AI · Hybrid retrieval over GitHub" })
        ] }) })
      ] })
    ] }),
    openSnippet && /* @__PURE__ */ jsxRuntimeExports.jsx(SnippetSheet, { snippet: openSnippet, repo: activeCache?.repo ?? repoInput, branch: openSnippet ? activeCache?.branch ?? "main" : "main", onClose: () => setOpenSnippet(null) })
  ] });
}
function IndexingPanel({
  phase,
  cached,
  cachedCount
}) {
  const [now, setNow] = reactExports.useState(Date.now());
  reactExports.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);
  if (phase.kind === "idle") return null;
  const elapsed = ((now - phase.startedAt) / 1e3).toFixed(1);
  const steps = cached ? [{
    id: "retrieving",
    label: "Retrieving from cache",
    eta: "~0.5s"
  }, {
    id: "answering",
    label: "Generating answer",
    eta: "~3–6s"
  }] : [{
    id: "fetching",
    label: "Fetching repository tree & files",
    eta: "~3–8s"
  }, {
    id: "retrieving",
    label: "Chunking & ranking",
    eta: "~1s"
  }, {
    id: "answering",
    label: "Generating answer",
    eta: "~3–6s"
  }];
  const activeIdx = steps.findIndex((s) => s.id === phase.kind);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-slide-in border border-border bg-surface rounded-2xl p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-primary animate-pulse" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:120ms]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:240ms]" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[11px] uppercase tracking-widest text-foreground", children: "Working" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[11px] text-muted-foreground tabular-nums", children: [
        elapsed,
        "s elapsed"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "space-y-3", children: steps.map((s, i) => {
      const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${state === "done" ? "bg-primary text-primary-foreground" : state === "active" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`, children: state === "done" ? "✓" : i + 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex-1 text-sm ${state === "pending" ? "text-muted-foreground" : "text-foreground"}`, children: s.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: state === "active" ? "running" : s.eta })
      ] }, s.id);
    }) }),
    cached && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-4 border-t border-border/60 font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: [
      "Reusing ",
      cachedCount,
      " cached files — no GitHub round-trip"
    ] })
  ] });
}
function TurnView({
  turn,
  repo,
  branch,
  onOpenSnippet
}) {
  if (turn.role === "user") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-slide-in", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2", children: "Query" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-medium text-foreground", children: turn.content })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-slide-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `font-mono text-[10px] inline-block px-2 py-1 rounded uppercase tracking-widest ${turn.error ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"}`, children: turn.error ? "Error" : "Answer" }),
      turn.branch && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: [
        "branch: ",
        turn.branch
      ] }),
      turn.stats && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-muted-foreground", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: [
          turn.stats.retrievedChunks,
          "/",
          turn.stats.totalChunks,
          " chunks"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-muted-foreground", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: [
          (turn.stats.totalMs / 1e3).toFixed(1),
          "s"
        ] }),
        turn.stats.usedCache && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-muted-foreground", children: "·" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-primary uppercase tracking-widest", children: "cached" })
        ] })
      ] })
    ] }),
    turn.error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-destructive", children: turn.content }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Markdown, { content: turn.content }),
    turn.snippets && turn.snippets.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 pt-5 border-t border-border/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3", children: [
        "Citations · ",
        turn.snippets.length,
        " snippet",
        turn.snippets.length === 1 ? "" : "s"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: turn.snippets.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(CitationCard, { snippet: s, repo, branch, onOpen: () => onOpenSnippet(s) }, i)) })
    ] })
  ] });
}
function CitationCard({
  snippet,
  repo,
  branch,
  onOpen
}) {
  const ghUrl = `https://github.com/${repo}/blob/${branch}/${snippet.path}#L${snippet.startLine}-L${snippet.endLine}`;
  const previewLines = snippet.code.split("\n").slice(0, 3).join("\n");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border bg-surface rounded-xl overflow-hidden hover:border-primary/60 transition-colors", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onOpen, className: "w-full text-left p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-mono text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded uppercase tracking-widest shrink-0 mt-0.5", children: [
        "L",
        snippet.startLine,
        "–",
        snippet.endLine
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-xs text-foreground truncate", children: snippet.path }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "font-mono text-[11px] text-muted-foreground mt-1 truncate whitespace-pre overflow-hidden", children: previewLines.split("\n")[0]?.trim().slice(0, 100) || "…" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-primary uppercase tracking-widest shrink-0", children: "View →" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border/60 px-3 py-1.5 flex items-center justify-between bg-background/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: snippet.language }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: ghUrl, target: "_blank", rel: "noreferrer", className: "font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest", children: "Open on GitHub ↗" })
    ] })
  ] });
}
function SnippetSheet({
  snippet,
  repo,
  branch,
  onClose
}) {
  reactExports.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const ghUrl = `https://github.com/${repo}/blob/${branch}/${snippet.path}#L${snippet.startLine}-L${snippet.endLine}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { "aria-label": "Close", onClick: onClose, className: "flex-1 bg-foreground/30 backdrop-blur-sm" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-2xl bg-background border-l border-border shadow-2xl flex flex-col animate-slide-in", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border px-6 py-4 flex items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1", children: [
            "Snippet · L",
            snippet.startLine,
            "–",
            snippet.endLine
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-sm text-foreground truncate", children: snippet.path })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest shrink-0", children: "Close ✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(highlighter, { language: snippet.language, style: oneLight, showLineNumbers: true, startingLineNumber: snippet.startLine, customStyle: {
        margin: 0,
        padding: "1.25rem",
        background: "transparent",
        fontSize: "12.5px",
        lineHeight: "1.55"
      }, lineNumberStyle: {
        color: "var(--color-muted-foreground)",
        opacity: 0.5,
        paddingRight: "1rem",
        userSelect: "none"
      }, children: snippet.code }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border px-6 py-3 flex items-center justify-between bg-surface", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: snippet.language }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: ghUrl, target: "_blank", rel: "noreferrer", className: "font-mono text-[10px] text-primary hover:underline uppercase tracking-widest", children: "Open on GitHub ↗" })
      ] })
    ] })
  ] });
}
function Markdown({
  content
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[15px] leading-7 text-foreground space-y-4 [&>*:first-child]:mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Markdown$1, { remarkPlugins: [remarkGfm], components: {
    h1: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold tracking-tight mt-6 mb-3", children }),
    h2: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold tracking-tight mt-6 mb-2", children }),
    h3: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-bold tracking-tight mt-5 mb-2", children }),
    p: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "leading-7", children }),
    ul: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "list-disc pl-6 space-y-1.5 marker:text-muted-foreground", children }),
    ol: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "list-decimal pl-6 space-y-1.5 marker:text-muted-foreground", children }),
    li: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "leading-7", children }),
    strong: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "font-semibold", children }),
    em: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("em", { className: "italic", children }),
    a: ({
      children,
      href
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href, target: "_blank", rel: "noreferrer", className: "text-primary underline underline-offset-2 hover:opacity-80", children }),
    blockquote: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("blockquote", { className: "border-l-2 border-primary pl-4 italic text-muted-foreground", children }),
    hr: () => /* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "border-border my-6" }),
    table: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto border border-border rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-sm", children }) }),
    thead: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted", children }),
    th: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-3 py-2 font-semibold border-b border-border", children }),
    td: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 border-b border-border/60", children }),
    code: ({
      className,
      children,
      ...props
    }) => {
      const inline = !props.node || !className;
      const match = /language-(\w+)/.exec(className || "");
      const code = String(children).replace(/\n$/, "");
      if (inline && !match) {
        return /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-[0.85em] bg-muted text-foreground px-1.5 py-0.5 rounded border border-border", children });
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "my-2 rounded-lg overflow-hidden border border-border", children: [
        match && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-muted px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border", children: match[1] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(highlighter, { language: match?.[1] ?? "text", style: oneLight, customStyle: {
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "12.5px",
          lineHeight: "1.55"
        }, children: code })
      ] });
    },
    pre: ({
      children
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children })
  }, children: content }) });
}
export {
  ConsolePage as component
};
