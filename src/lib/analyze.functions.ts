import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AnalysisResult, NewsMatch, NewsMeta } from "./types";

// Rough outlet reputation registry (0-100). Higher = more established/reputable.
// Not exhaustive — unknown outlets default to 50.
const OUTLET_REPUTATION: Record<string, number> = {
  "reuters": 98, "associated press": 97, "ap news": 97, "bbc news": 95, "bbc": 95,
  "the new york times": 94, "the washington post": 93, "the guardian": 92,
  "the wall street journal": 93, "financial times": 93, "npr": 92, "pbs": 91,
  "bloomberg": 91, "the economist": 92, "nature": 96, "science": 96,
  "scientific american": 90, "abc news": 87, "cbs news": 87, "nbc news": 87,
  "cnn": 82, "fox news": 78, "usa today": 82, "time": 86, "the atlantic": 88,
  "politico": 85, "axios": 84, "the verge": 82, "wired": 84, "techcrunch": 78,
  "ars technica": 86, "engadget": 76, "vice": 70, "buzzfeed news": 72,
  "buzzfeed": 55, "daily mail": 40, "the sun": 38, "breitbart news": 35,
  "infowars": 15, "the onion": 20, "medium": 45, "substack": 45,
};

function reputationFor(source: string): number {
  const key = source.trim().toLowerCase();
  if (OUTLET_REPUTATION[key] != null) return OUTLET_REPUTATION[key];
  for (const k of Object.keys(OUTLET_REPUTATION)) {
    if (key.includes(k)) return OUTLET_REPUTATION[k];
  }
  return 50;
}

const inputSchema = z
  .object({
    text: z.string().trim().max(20000).optional().default(""),
    sourceUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  })
  .refine((d) => (d.text && d.text.length >= 40) || (d.sourceUrl && d.sourceUrl.length > 0), {
    message: "Provide article text (40+ chars) or a source URL",
  });

async function fetchArticleFromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TruthGuardBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.slice(0, 12000);
  } catch (e) {
    console.error("URL fetch failed:", e);
    return "";
  }
}

const SYSTEM_PROMPT = `You are TruthGuard, an expert fact-checker and media literacy analyst.
You receive a news article (and optional source URL) and you assess credibility.

Return STRICT JSON matching this schema exactly:
{
  "overallScore": number 0-100,
  "verdict": "likely_real" | "suspicious" | "likely_fake",
  "attentionGrabbing": { "score": 0-100, "summary": string, "detail": string },
  "emotionalTone":     { "score": 0-100, "summary": string, "detail": string },
  "sourceReliability": { "score": 0-100, "summary": string, "detail": string },
  "contentQuality":    { "score": 0-100, "summary": string, "detail": string },
  "aiExplanation": string,
  "keyClaims": string[]
}

Scoring guidance (higher = more credible). overallScore >=70 likely_real, 40-69 suspicious, <40 likely_fake.
Be unbiased, evidence-based. Return JSON only, no markdown.`;

async function callAI(text: string, sourceUrl: string | undefined, apiKey: string) {
  const userMsg = `Article text:\n"""${text.slice(0, 12000)}"""\n\nSource URL: ${sourceUrl || "(not provided)"}`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI gateway returned empty content");
  return JSON.parse(content);
}

async function searchNewsAPI(
  query: string,
  apiKey: string,
): Promise<{ matches: NewsMatch[]; meta: NewsMeta }> {
  if (!apiKey) {
    console.log("❌ NEWS_API_KEY is missing");
    return {
      matches: [],
      meta: {
        status: "missing_key",
        message: "News cross-referencing is disabled — NEWS_API_KEY is not configured on the server.",
        query,
      },
    };
  }

  if (!query) {
    console.log("❌ Search query is empty");
    return {
      matches: [],
      meta: {
        status: "empty",
        message: "No search query could be built from the article.",
        query,
      },
    };
  }

  try {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", query.slice(0, 200));
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "relevancy");
    url.searchParams.set("pageSize", "8");

    console.log("================================");
    console.log("News Query:", query);
    console.log("API Key Present:", !!apiKey);
    console.log("Request URL:", url.toString());

    const res = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    console.log("Status:", res.status);

    const data = await res.json();

    console.log("NewsAPI Response:");
    console.log(JSON.stringify(data, null, 2));

    const articles: any[] = data.articles || [];

    console.log("Articles Found:", articles.length);

    const matches: NewsMatch[] = articles.map((a, i) => ({
      title: a.title ?? "Untitled",
      url: a.url,
      source: a.source?.name ?? "Unknown",
      matchScore: Math.max(40, 95 - i * 7),
      reputationScore: reputationFor(a.source?.name ?? "Unknown"),
      publishedAt: a.publishedAt,
    }));

    return {
      matches,
      meta: {
        status: matches.length ? "ok" : "empty",
        message: matches.length
          ? undefined
          : "News database returned no matching articles.",
        query,
      },
    };
  } catch (e: any) {
    console.error(e);

    return {
      matches: [],
      meta: {
        status: "error",
        message: e.message,
        query,
      },
    };
  }
}
function heuristicAnalysis(text: string, sourceUrl?: string): AnalysisResult {
  const lower = text.toLowerCase();
  const exclam = (text.match(/!/g) || []).length;
  const caps = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
  const sensational = ["shocking", "you won't believe", "miracle", "exposed", "bombshell", "secret"];
  const hits = sensational.filter((w) => lower.includes(w)).length;
  const wordCount = text.split(/\s+/).length;

  const attention = Math.max(10, 90 - hits * 15 - exclam * 4 - caps * 5);
  const emotional = Math.max(15, 88 - hits * 12 - exclam * 3);
  const source = sourceUrl ? 65 : 45;
  const quality = Math.min(90, 40 + Math.min(40, wordCount / 10));
  const overall = Math.round((attention + emotional + source + quality) / 4);
  const verdict = overall >= 70 ? "likely_real" : overall >= 40 ? "suspicious" : "likely_fake";

  return {
    overallScore: overall,
    verdict,
    attentionGrabbing: { score: attention, summary: hits ? "Sensational language detected" : "Measured tone", detail: `Found ${hits} sensational phrases, ${exclam} exclamations.` },
    emotionalTone: { score: emotional, summary: hits > 1 ? "Emotionally charged" : "Mostly neutral", detail: "Heuristic estimate based on language patterns." },
    sourceReliability: { score: source, summary: sourceUrl ? "Source URL provided" : "No source", detail: "Heuristic; AI analysis unavailable." },
    contentQuality: { score: quality, summary: wordCount > 200 ? "Substantive length" : "Short content", detail: `Article is ${wordCount} words.` },
    aiExplanation: "AI analysis temporarily unavailable; this is a fallback heuristic assessment. Verify with the news matches below.",
    keyClaims: [text.split(".")[0]?.slice(0, 120) || "Main claim"],
    newsMatches: [],
    newsMeta: { status: "empty" },
  };
}

export const analyzeArticle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ result: AnalysisResult; id: string }> => {
    const aiKey = process.env.LOVABLE_API_KEY || process.env.OPENAI_API_KEY;
    const newsKey = process.env.NEWS_API_KEY || "";
    const sourceUrl = data.sourceUrl || undefined;

    // If the article text is missing or short, fetch the URL and use its content
    let articleText = data.text || "";
    if (sourceUrl && articleText.trim().length < 200) {
      const fetched = await fetchArticleFromUrl(sourceUrl);
      if (fetched.length > articleText.length) {
        articleText = fetched;
      }
    }

    // Final guard — need at least some content for AI
    if (articleText.trim().length < 40) {
      articleText = `(Only a source URL was provided: ${sourceUrl}. Assess the domain's known reliability and explain that the article body could not be retrieved.)`;
    }

    let aiOut: any = null;
    if (aiKey) {
      try {
        aiOut = await callAI(articleText, sourceUrl, aiKey);
      } catch (e) {
        console.error("AI failed:", e);
      }
    }

    const base: AnalysisResult = aiOut
      ? {
          overallScore: Number(aiOut.overallScore) || 50,
          verdict: aiOut.verdict || "suspicious",
          attentionGrabbing: aiOut.attentionGrabbing,
          emotionalTone: aiOut.emotionalTone,
          sourceReliability: aiOut.sourceReliability,
          contentQuality: aiOut.contentQuality,
          aiExplanation: aiOut.aiExplanation || "",
          keyClaims: Array.isArray(aiOut.keyClaims) ? aiOut.keyClaims.slice(0, 5) : [],
          newsMatches: [],
          newsMeta: { status: "empty" },
        }
      : heuristicAnalysis(articleText, sourceUrl);

    function buildSearchQuery(claims: string[]) {
  const words = claims
    .join(" ")
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  return [...new Set(words)].slice(0, 6).join(" OR ");
}

const query =
  buildSearchQuery(base.keyClaims) ||
  articleText
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6)
    .join(" OR ");
    try {
      const { matches, meta } = await searchNewsAPI(query, newsKey);
      base.newsMatches = matches;
      base.newsMeta = meta;
    } catch (e: any) {
      console.error("NewsAPI failed:", e);
      base.newsMeta = { status: "error", message: e?.message ?? "News lookup failed", query };
    }

    return { result: base, id: "" };
  });
