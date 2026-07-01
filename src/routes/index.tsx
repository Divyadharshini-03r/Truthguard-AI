import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Globe2, Sparkles, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TruthGuard AI — Detect Fake News with AI + Global Verification" },
      { name: "description", content: "Paste any article. TruthGuard AI cross-references it with the global news database to score credibility in seconds." },
      { property: "og:title", content: "TruthGuard AI" },
      { property: "og:description", content: "AI-powered fake news detection with global news cross-referencing." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <Shield className="w-5 h-5" />
            </span>
            TruthGuard <span className="text-primary">AI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button asChild size="sm"><Link to="/dashboard">Open app</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-accent)_0%,_transparent_60%)] opacity-60" />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border text-xs font-medium text-muted-foreground mb-6 shadow-[var(--shadow-soft)]">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Powered by GPT-4o-mini + Global News Database
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto">
              Stop misinformation
              <span className="block bg-gradient-to-r from-primary to-[oklch(0.6_0.18_180)] bg-clip-text text-transparent">
                before it spreads.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Paste any article and TruthGuard AI delivers a detailed credibility score, expert-level analysis,
              and live matches from thousands of verified news sources worldwide.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base shadow-[var(--shadow-elevated)]">
                <Link to="/dashboard">Start analyzing <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Free to use", "No sign-up", "Results in seconds"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-trust-high)]" />{t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Sparkles, title: "AI fact-checking", body: "GPT-4o-mini analyzes tone, claims, sourcing, and language patterns like a media literacy expert." },
              { icon: Globe2, title: "Global news matches", body: "Every article is cross-referenced live against the global news database for verification." },
              { icon: BarChart3, title: "4 trust dimensions", body: "Attention grabbing, emotional tone, source reliability and content quality — each scored 0–100." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border bg-card p-6 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-lg bg-accent grid place-items-center text-accent-foreground mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} TruthGuard AI</span>
          <Link to="/dashboard" className="hover:text-foreground">Open app</Link>
        </div>
      </footer>
    </div>
  );
}
