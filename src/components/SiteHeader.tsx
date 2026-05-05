import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-primary rounded-sm relative overflow-hidden">
            <div className="absolute inset-1 border border-primary-foreground/40" />
          </div>
          <span className="text-xl font-bold tracking-tighter">GitWhisper</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#pipeline" className="hover:text-foreground transition-colors">Pipeline</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <Link
          to="/console"
          className="text-sm font-bold text-primary hover:underline underline-offset-4"
        >
          Launch Console →
        </Link>
      </div>
    </header>
  );
}
