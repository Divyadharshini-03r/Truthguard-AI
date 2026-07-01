import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, Globe, Loader2, Sparkles, AlertTriangle, CheckCircle2,
  Megaphone, Heart, Link2, FileText, ExternalLink, Info, KeyRound, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScoreGauge } from "@/components/ScoreGauge";
import { AnalysisCard } from "@/components/AnalysisCard";
import { analyzeArticle } from "@/lib/analyze.functions";
import type { AnalysisResult, Verdict } from "@/lib/types";
import { toast } from "sonner";

type SortMode = "relevance" | "recency" | "reputation";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TruthGuard AI" }] }),
  component: Dashboard,
});

const SAMPLES = {
  suspicious: `SHOCKING: Scientists EXPOSE secret miracle cure that BIG PHARMA doesn't want you to know! This one weird trick has been HIDDEN for decades. You won't BELIEVE what doctors are saying. Share before they delete this!! A whistleblower from a top secret lab has revealed that an everyday kitchen ingredient can cure any disease in 24 hours. Mainstream media refuses to cover this BOMBSHELL story.`,
  credible: `The European Space Agency announced on Thursday that its JUICE spacecraft, launched in 2023, successfully completed a gravity-assist flyby of Earth and the Moon, the first ever lunar-Earth double flyby. According to ESA mission director Ignacio Tanco, the maneuver shortened the probe's journey to Jupiter by about a year. The spacecraft is expected to reach the Jovian system in July 2031 to study three of Jupiter's icy moons: Europa, Ganymede, and Callisto.`,
};

const VERDICT_META: Record<Verdict, { label: string; tone: "trust-high" | "trust-med" | "trust-low"; icon: any }> = {
  likely_real:  { label: "Likely Real",  tone: "trust-high", icon: CheckCircle2 },
  suspicious:   { label: "Suspicious",   tone: "trust-med",  icon: AlertTriangle },
  likely_fake:  { label: "Likely Fake",  tone: "trust-low",  icon: AlertTriangle },
};

const MIN_CHARS = 100;
const MAX_CHARS = 10000;

function validateUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "URL must start with http:// or https://";
    if (!u.hostname.includes(".")) return "Enter a valid domain (e.g. example.com)";
    return null;
  } catch {
    return "Enter a valid URL (e.g. https://example.com/article)";
  }
}

function Dashboard() {
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");

  const sortedMatches = useMemo(() => {
    if (!result) return [];
    const arr = [...result.newsMatches];
    if (sortMode === "recency") {
      arr.sort((a, b) => {
        const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return bt - at;
      });
    } else if (sortMode === "reputation") {
      arr.sort((a, b) => b.reputationScore - a.reputationScore);
    } else {
      arr.sort((a, b) => b.matchScore - a.matchScore);
    }
    return arr;
  }, [result, sortMode]);

  const charCount = text.trim().length;
  const urlError = validateUrl(sourceUrl);
  const hasUrl = !!sourceUrl.trim() && !urlError;
  const textError =
    charCount === 0
      ? null
      : charCount < MIN_CHARS
        ? `Add at least ${MIN_CHARS - charCount} more character${MIN_CHARS - charCount === 1 ? "" : "s"}, or rely on the source URL alone.`
        : charCount > MAX_CHARS
          ? `Text is too long. Remove ${(charCount - MAX_CHARS).toLocaleString()} character${charCount - MAX_CHARS === 1 ? "" : "s"}.`
          : null;
  const textOk = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const canAnalyze = !urlError && (textOk || (hasUrl && charCount === 0)) && charCount <= MAX_CHARS;
  const disabledReason = !canAnalyze
    ? urlError
      ? "Fix the source URL to continue."
      : charCount === 0
        ? "Paste an article or provide a source URL."
        : charCount < MIN_CHARS
          ? `Article too short — add ${MIN_CHARS} characters or provide a source URL.`
          : `Article too long — keep it under ${MAX_CHARS.toLocaleString()} characters.`
    : null;

  const analyzeFn = useServerFn(analyzeArticle);

  const analyze = useMutation({
    mutationFn: () => analyzeFn({ data: { text, sourceUrl } }),
    onSuccess: (data) => {
      setResult(data.result);
      toast.success("Analysis complete");
    },
    onError: (err: any) => toast.error(err.message ?? "Analysis failed"),
  });

  const meta = result ? VERDICT_META[result.verdict] : null;
  const VerdictIcon = meta?.icon;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <Shield className="w-5 h-5" />
            </span>
            TruthGuard <span className="text-primary">AI</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h1 className="text-xl font-bold text-foreground">Analyze an article</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste the article text below. We'll score it and cross-reference with the global news database.
          </p>

          <div className="mt-5 space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full article text here..."
              className={`min-h-44 resize-none text-sm ${textError ? "border-[var(--color-trust-low)] focus-visible:ring-[var(--color-trust-low)]" : ""}`}
              aria-invalid={!!textError}
              aria-describedby="text-help"
            />
            <div id="text-help" className="flex justify-between gap-3 text-xs">
              <span className={textError ? "text-[var(--color-trust-low)]" : "text-muted-foreground"}>
                {textError ?? `Minimum ${MIN_CHARS} characters. Longer text yields better analysis.`}
              </span>
              <span className={`tabular-nums shrink-0 ${charCount > MAX_CHARS ? "text-[var(--color-trust-low)]" : "text-muted-foreground"}`}>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>

            <div>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Source URL (optional)"
                  className={`pl-9 ${urlError ? "border-[var(--color-trust-low)] focus-visible:ring-[var(--color-trust-low)]" : ""}`}
                  aria-invalid={!!urlError}
                  aria-describedby="url-help"
                />
              </div>
              {urlError && (
                <p id="url-help" className="mt-1.5 text-xs text-[var(--color-trust-low)]">{urlError}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setText(SAMPLES.suspicious)}>
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-[var(--color-trust-low)]" /> Try suspicious sample
              </Button>
              <Button variant="outline" size="sm" onClick={() => setText(SAMPLES.credible)}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-[var(--color-trust-high)]" /> Try credible sample
              </Button>
            </div>

            <Button
              size="lg"
              onClick={() => analyze.mutate()}
              disabled={analyze.isPending || !canAnalyze}
              className="w-full h-12 text-base shadow-[var(--shadow-elevated)]"
              title={disabledReason ?? undefined}
            >
              {analyze.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with AI + Global Database...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Analyze article</>
              )}
            </Button>
            {disabledReason && !analyze.isPending && (
              <p className="text-xs text-center text-muted-foreground">{disabledReason}</p>
            )}
          </div>
        </section>

        {result && meta && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] flex flex-col sm:flex-row items-center gap-6">
              <ScoreGauge score={result.overallScore} />
              <div className="flex-1 text-center sm:text-left">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: `var(--color-${meta.tone}-bg)`, color: `var(--color-${meta.tone})` }}
                >
                  {VerdictIcon && <VerdictIcon className="w-4 h-4" />} {meta.label}
                </div>
                <h2 className="mt-3 text-xl font-bold text-foreground">AI verdict</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.aiExplanation}</p>
                {result.keyClaims.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Key claims extracted</div>
                    <ul className="space-y-1">
                      {result.keyClaims.map((c, i) => (
                        <li key={i} className="text-sm text-foreground/90 flex gap-2">
                          <span className="text-primary">•</span><span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <AnalysisCard icon={<Megaphone className="w-5 h-5" />} title="Attention Grabbing" category={result.attentionGrabbing} />
              <AnalysisCard icon={<Heart className="w-5 h-5" />} title="Emotional Tone" category={result.emotionalTone} />
              <AnalysisCard icon={<Link2 className="w-5 h-5" />} title="Source Reliability" category={result.sourceReliability} />
              <AnalysisCard icon={<FileText className="w-5 h-5" />} title="Content Quality" category={result.contentQuality} />
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Global News Database Matches</h3>
                <span className="text-xs text-muted-foreground">({result.newsMatches.length})</span>
                {result.newsMatches.length > 1 && (
                  <div className="ml-auto flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-xs">
                    {(["relevance", "recency", "reputation"] as SortMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSortMode(m)}
                        className={`px-2.5 py-1 rounded-md capitalize transition ${
                          sortMode === m
                            ? "bg-background text-foreground shadow-sm font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(() => {
                const meta = result.newsMeta;
                if (meta.status === "missing_key") {
                  return (
                    <Alert variant="destructive">
                      <KeyRound className="w-4 h-4" />
                      <AlertTitle>News cross-referencing unavailable</AlertTitle>
                      <AlertDescription>
                        {meta.message ?? "NEWS_API_KEY is not configured."} The AI credibility score above is still valid, but we couldn't compare this story against the global news database.
                      </AlertDescription>
                    </Alert>
                  );
                }
                if (meta.status === "rate_limited") {
                  return (
                    <Alert variant="destructive">
                      <Clock className="w-4 h-4" />
                      <AlertTitle>News database rate limit reached</AlertTitle>
                      <AlertDescription>
                        {meta.message ?? "Too many requests to the news API."} Wait a few minutes and re-run the analysis to fetch matches.
                      </AlertDescription>
                    </Alert>
                  );
                }
                if (meta.status === "error") {
                  return (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertTitle>Couldn't reach the news database</AlertTitle>
                      <AlertDescription>{meta.message ?? "Unknown error."}</AlertDescription>
                    </Alert>
                  );
                }
                if (result.newsMatches.length === 0) {
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">No closely matching news articles found.</p>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                          <Info className="w-4 h-4 text-primary" /> Why no matches?
                        </div>
                        <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                          <li>• <span className="text-foreground/80">Breaking or very recent</span> — indexing lags a few hours behind publication.</li>
                          <li>• <span className="text-foreground/80">Hyper-local or niche</span> — the story may only appear in outlets not covered by NewsAPI.</li>
                          <li>• <span className="text-foreground/80">Non-English coverage</span> — search is scoped to English; try translating key terms.</li>
                          <li>• <span className="text-foreground/80">Older than ~30 days</span> — NewsAPI's free tier only indexes the last month.</li>
                          <li>• <span className="text-foreground/80">Fabricated or misleading</span> — if the claim is major and no reputable outlet reports it, treat the article with strong skepticism.</li>
                        </ul>
                        {meta.query && (
                          <div className="mt-3 text-[11px] text-muted-foreground">
                            Searched for: <span className="font-mono text-foreground/70">{meta.query.slice(0, 140)}{meta.query.length > 140 ? "…" : ""}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <ul className="divide-y">
                    {sortedMatches.map((m, i) => (
                      <li key={i} className="py-3 flex items-start gap-3">
                        <div className="text-xs font-semibold text-primary mt-1 tabular-nums w-10 shrink-0">{m.matchScore}%</div>
                        <div className="flex-1 min-w-0">
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary line-clamp-2 inline-flex items-start gap-1">
                            {m.title} <ExternalLink className="w-3 h-3 mt-1 shrink-0" />
                          </a>
                          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
                            <span>{m.source}</span>
                            {m.publishedAt && <span>· {new Date(m.publishedAt).toLocaleDateString()}</span>}
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums"
                              style={{
                                backgroundColor: `var(--color-${m.reputationScore >= 75 ? "trust-high" : m.reputationScore >= 50 ? "trust-med" : "trust-low"}-bg)`,
                                color: `var(--color-${m.reputationScore >= 75 ? "trust-high" : m.reputationScore >= 50 ? "trust-med" : "trust-low"})`,
                              }}
                              title="Outlet reputation score"
                            >
                              rep {m.reputationScore}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
