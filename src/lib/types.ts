export interface CategoryResult {
  score: number;
  summary: string;
  detail: string;
}

export interface NewsMatch {
  title: string;
  url: string;
  source: string;
  matchScore: number;
  reputationScore: number;
  publishedAt?: string;
}

export type NewsStatus = "ok" | "empty" | "missing_key" | "rate_limited" | "error";

export interface NewsMeta {
  status: NewsStatus;
  message?: string;
  query?: string;
}

export type Verdict = "likely_real" | "suspicious" | "likely_fake";

export interface AnalysisResult {
  overallScore: number;
  verdict: Verdict;
  attentionGrabbing: CategoryResult;
  emotionalTone: CategoryResult;
  sourceReliability: CategoryResult;
  contentQuality: CategoryResult;
  aiExplanation: string;
  keyClaims: string[];
  newsMatches: NewsMatch[];
  newsMeta: NewsMeta;
}
