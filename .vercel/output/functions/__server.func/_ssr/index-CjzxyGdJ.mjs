import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
function SiteHeader() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "border-b border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", className: "flex items-center gap-2.5 group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-7 h-7 bg-primary rounded-sm relative overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-1 border border-primary-foreground/40" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl font-bold tracking-tighter", children: "GitWhisper" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#features", className: "hover:text-foreground transition-colors", children: "Features" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#pipeline", className: "hover:text-foreground transition-colors", children: "Pipeline" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#faq", className: "hover:text-foreground transition-colors", children: "FAQ" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: "/console",
        className: "text-sm font-bold text-primary hover:underline underline-offset-4",
        children: "Launch Console →"
      }
    )
  ] }) });
}
function SiteFooter() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "border-t border-border/60 mt-32", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-6xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row justify-between gap-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "(a) GitWhisper Core v0.1 — RAG over GitHub" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "(b) Built with Lovable AI · Hybrid Search · Citations" })
  ] }) });
}
function Home() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "max-w-6xl mx-auto px-6 md:px-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "pt-20 md:pt-32 pb-24 grid-paper -mx-6 md:-mx-10 px-6 md:px-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl animate-slide-in", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-primary inline-block" }),
            "(01) System online · index ready"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-5xl md:text-7xl font-bold tracking-tighter leading-[1.02] text-balance mb-8", children: [
            "Query your codebase with ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "absolute precision" }),
            "."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed", children: "GitWhisper maps any GitHub repository into a semantic index. Ask architectural questions in plain English and get code-accurate answers with deep-link file citations." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/console", className: "bg-foreground text-background px-6 py-3.5 rounded-lg text-sm font-bold hover:bg-foreground/90 transition-colors", children: "Launch Console →" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#pipeline", className: "border border-border bg-surface text-foreground px-6 py-3.5 rounded-lg text-sm font-bold hover:bg-muted transition-colors", children: "How it works" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-16 max-w-4xl animate-slide-in-delay", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-surface border border-border rounded-2xl shadow-sm overflow-hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border/60 px-4 py-2.5 flex items-center justify-between bg-muted/40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-destructive/60" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-primary/60" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-foreground/20" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest", children: "whisper.console" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] text-primary", children: "● synced" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground uppercase tracking-widest", children: "Query" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base", children: "How does the auth middleware handle token expiration?" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border/60 pt-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[10px] bg-foreground text-background inline-block px-2 py-1 rounded uppercase tracking-widest mb-3", children: "Answer" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground leading-relaxed", children: [
                "The middleware reads the ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-foreground", children: "Authorization" }),
                " header, decodes the JWT, and rejects expired tokens with a ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-foreground", children: "401" }),
                ". Refresh logic lives upstream in the route guard."
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: ["src/auth/middleware.ts:42", "src/lib/jwt.ts:18", "src/routes/api/login.ts:7"].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[11px] border border-border bg-background px-2 py-1 rounded text-foreground", children: c }, c)) })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "features", className: "py-20 border-t border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-4", children: "(02) Capabilities" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl md:text-5xl font-bold tracking-tighter mb-12 max-w-2xl text-balance", children: "Built for engineers who refuse to grep." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border", children: [{
          n: "01",
          t: "Semantic chunking",
          d: "Code is split by meaningful units — functions, classes, modules — and embedded for hybrid retrieval."
        }, {
          n: "02",
          t: "Re-ranked RAG",
          d: "Hybrid vector + keyword search with re-ranking surfaces the snippets the LLM actually needs."
        }, {
          n: "03",
          t: "File-level citations",
          d: "Every answer points back to exact files and line ranges so you can verify the source instantly."
        }].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-surface p-8 hover:bg-background transition-colors", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-xs text-primary mb-6", children: f.n }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold tracking-tight mb-3", children: f.t }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: f.d })
        ] }, f.n)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "pipeline", className: "py-20 border-t border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-4", children: "(03) Pipeline" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl md:text-5xl font-bold tracking-tighter mb-12 max-w-2xl text-balance", children: "From repository URL to verifiable answer." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [{
          s: "Fetch",
          d: "Pull the repo tree via the GitHub API."
        }, {
          s: "Chunk",
          d: "Split files into meaningful semantic units."
        }, {
          s: "Embed",
          d: "Vector + keyword index for hybrid search."
        }, {
          s: "Answer",
          d: "Re-rank, cite, and stream the response."
        }].map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-2xl p-6 bg-surface relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3", children: [
            "Step 0",
            i + 1
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold tracking-tight mb-2", children: p.s }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: p.d })
        ] }, p.s)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "faq", className: "py-20 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-12", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-4", children: "(04) FAQ" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl md:text-4xl font-bold tracking-tighter text-balance", children: "Common questions." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:col-span-2 space-y-6", children: [{
          q: "Which repos can I query?",
          a: "Any public GitHub repository. Just paste the owner/repo and start asking."
        }, {
          q: "How are answers verified?",
          a: "Every response includes file paths cited inline so you can open the source and confirm the claim."
        }, {
          q: "What models power it?",
          a: "Lovable AI with Gemini and GPT-5 class models. No API key required."
        }].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border pt-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-bold tracking-tight mb-2", children: f.q }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: f.a })
        ] }, f.q)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "py-20 border-t border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-foreground text-background rounded-3xl p-12 md:p-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[11px] uppercase tracking-widest mb-4 opacity-60", children: "(05) Ready when you are" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-4xl md:text-5xl font-bold tracking-tighter text-balance max-w-xl", children: "Stop scrolling files. Start asking." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/console", className: "bg-primary text-primary-foreground px-7 py-4 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors whitespace-nowrap", children: "Open Console →" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SiteFooter, {})
  ] });
}
export {
  Home as component
};
