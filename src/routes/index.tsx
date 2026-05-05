import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GitWhisper — Ask your GitHub repo anything" },
      { name: "description", content: "AI-powered Q&A for any public GitHub repository. RAG pipeline with hybrid search, re-ranking, and file-level citations." },
      { property: "og:title", content: "GitWhisper — Ask your GitHub repo anything" },
      { property: "og:description", content: "Map any repository into a semantic index, then query it in plain English with verifiable file citations." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 md:px-10">
        <section className="pt-20 md:pt-32 pb-24 grid-paper -mx-6 md:-mx-10 px-6 md:px-10">
          <div className="max-w-4xl animate-slide-in">
            <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              (01) System online · index ready
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.02] text-balance mb-8">
              Query your codebase with <span className="text-primary">absolute precision</span>.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              GitWhisper maps any GitHub repository into a semantic index. Ask architectural
              questions in plain English and get code-accurate answers with deep-link file
              citations.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/console"
                className="bg-foreground text-background px-6 py-3.5 rounded-lg text-sm font-bold hover:bg-foreground/90 transition-colors"
              >
                Launch Console →
              </Link>
              <a
                href="#pipeline"
                className="border border-border bg-surface text-foreground px-6 py-3.5 rounded-lg text-sm font-bold hover:bg-muted transition-colors"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Console preview */}
          <div className="mt-16 max-w-4xl animate-slide-in-delay">
            <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-border/60 px-4 py-2.5 flex items-center justify-between bg-muted/40">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-foreground/20" />
                </div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  whisper.console
                </div>
                <div className="font-mono text-[10px] text-primary">● synced</div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground uppercase tracking-widest">
                    Query
                  </div>
                  <div className="text-base">How does the auth middleware handle token expiration?</div>
                </div>
                <div className="border-t border-border/60 pt-4">
                  <div className="font-mono text-[10px] bg-foreground text-background inline-block px-2 py-1 rounded uppercase tracking-widest mb-3">
                    Answer
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The middleware reads the <span className="font-mono text-foreground">Authorization</span> header,
                    decodes the JWT, and rejects expired tokens with a <span className="font-mono text-foreground">401</span>.
                    Refresh logic lives upstream in the route guard.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["src/auth/middleware.ts:42", "src/lib/jwt.ts:18", "src/routes/api/login.ts:7"].map((c) => (
                      <span key={c} className="font-mono text-[11px] border border-border bg-background px-2 py-1 rounded text-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 border-t border-border/60">
          <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-4">
            (02) Capabilities
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-12 max-w-2xl text-balance">
            Built for engineers who refuse to grep.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {[
              { n: "01", t: "Semantic chunking", d: "Code is split by meaningful units — functions, classes, modules — and embedded for hybrid retrieval." },
              { n: "02", t: "Re-ranked RAG", d: "Hybrid vector + keyword search with re-ranking surfaces the snippets the LLM actually needs." },
              { n: "03", t: "File-level citations", d: "Every answer points back to exact files and line ranges so you can verify the source instantly." },
            ].map((f) => (
              <div key={f.n} className="bg-surface p-8 hover:bg-background transition-colors">
                <div className="font-mono text-xs text-primary mb-6">{f.n}</div>
                <h3 className="text-xl font-bold tracking-tight mb-3">{f.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pipeline */}
        <section id="pipeline" className="py-20 border-t border-border/60">
          <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-4">
            (03) Pipeline
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-12 max-w-2xl text-balance">
            From repository URL to verifiable answer.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { s: "Fetch", d: "Pull the repo tree via the GitHub API." },
              { s: "Chunk", d: "Split files into meaningful semantic units." },
              { s: "Embed", d: "Vector + keyword index for hybrid search." },
              { s: "Answer", d: "Re-rank, cite, and stream the response." },
            ].map((p, i) => (
              <div key={p.s} className="border border-border rounded-2xl p-6 bg-surface relative">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                  Step 0{i + 1}
                </div>
                <div className="text-2xl font-bold tracking-tight mb-2">{p.s}</div>
                <p className="text-sm text-muted-foreground">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-4">
              (04) FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-balance">
              Common questions.
            </h2>
          </div>
          <div className="md:col-span-2 space-y-6">
            {[
              { q: "Which repos can I query?", a: "Any public GitHub repository. Just paste the owner/repo and start asking." },
              { q: "How are answers verified?", a: "Every response includes file paths cited inline so you can open the source and confirm the claim." },
              { q: "What models power it?", a: "Lovable AI with Gemini and GPT-5 class models. No API key required." },
            ].map((f) => (
              <div key={f.q} className="border-t border-border pt-6">
                <h3 className="text-lg font-bold tracking-tight mb-2">{f.q}</h3>
                <p className="text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-border/60">
          <div className="bg-foreground text-background rounded-3xl p-12 md:p-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest mb-4 opacity-60">
                (05) Ready when you are
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-balance max-w-xl">
                Stop scrolling files. Start asking.
              </h2>
            </div>
            <Link
              to="/console"
              className="bg-primary text-primary-foreground px-7 py-4 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Open Console →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
