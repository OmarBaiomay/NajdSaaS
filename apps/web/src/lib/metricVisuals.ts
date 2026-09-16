import {
  Eye,
  MousePointerClick,
  Wallet,
  Users,
  Target,
  Percent,
  ThumbsUp,
  Share2,
  MessageCircle,
  PlayCircle,
  TrendingUp,
  Star,
  Activity,
  ShoppingCart,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type MetricTone = "sky" | "indigo" | "emerald" | "violet" | "orange" | "teal" | "pink" | "rose" | "amber" | "slate";

interface MetricVisual {
  icon: LucideIcon;
  tone: MetricTone;
}

// Order matters — first keyword match wins, and this same order decides
// which metrics are promoted to the "hero" cards at the top of the page.
// Impressions / Spend / Purchases / Purchase ROAS lead the list (matching
// the reference report the default cards are meant to mirror), each split
// into its own dedicated bucket so it can't be shadowed by the broader
// conversion/revenue buckets further down.
const KEYWORD_VISUALS: { test: RegExp; icon: LucideIcon; tone: MetricTone }[] = [
  { test: /impression/i, icon: Eye, tone: "sky" },
  { test: /spend|cost|budget/i, icon: Wallet, tone: "emerald" },
  { test: /purchase/i, icon: Target, tone: "orange" },
  { test: /\broas\b/i, icon: TrendingUp, tone: "emerald" },
  { test: /click/i, icon: MousePointerClick, tone: "indigo" },
  { test: /reach|audience|follower|subscriber/i, icon: Users, tone: "violet" },
  { test: /ctr|rate|percentage/i, icon: Percent, tone: "teal" },
  { test: /conversion|result|lead/i, icon: Target, tone: "orange" },
  { test: /like|engagement|reaction/i, icon: ThumbsUp, tone: "pink" },
  { test: /share/i, icon: Share2, tone: "teal" },
  { test: /comment/i, icon: MessageCircle, tone: "rose" },
  { test: /video|play|view/i, icon: PlayCircle, tone: "rose" },
  { test: /revenue|value|sale/i, icon: TrendingUp, tone: "emerald" },
  { test: /rating|score/i, icon: Star, tone: "amber" },
  { test: /session|visit|activity/i, icon: Activity, tone: "indigo" },
  { test: /cart|order/i, icon: ShoppingCart, tone: "orange" },
];

export const HERO_PRIORITY = KEYWORD_VISUALS.map((v) => v.test);

// Composite/derived metrics ("Cost per 1,000 People Reached", "Average
// order value") technically match a hero keyword too but make poor
// headline numbers — prefer the plain metric the keyword actually names.
const COMPOSITE_METRIC_WORDS = /\bper\b|\baverage\b|\bavg\b|\beligible\b|\basset\b|\bstore\b|\bfrom\b/i;
const MAX_HERO_NAME_WORDS = 3;

/** Picks the simplest, most literal metric matching a hero keyword — the
 * shortest plain field name among candidates, skipping composite/derived
 * ones — or returns null if only awkward composite fields match. */
export function pickSimplestMatch(candidates: { field_id: string; field_name: string }[]) {
  const plain = candidates.filter((f) => !COMPOSITE_METRIC_WORDS.test(f.field_name));
  const short = plain.filter((f) => f.field_name.trim().split(/\s+/).length <= MAX_HERO_NAME_WORDS);
  if (short.length === 0) return null;
  return short.slice().sort((a, b) => a.field_name.length - b.field_name.length)[0];
}

export function getMetricVisual(fieldNameOrId: string): MetricVisual {
  const match = KEYWORD_VISUALS.find((v) => v.test.test(fieldNameOrId));
  return match ? { icon: match.icon, tone: match.tone } : { icon: BarChart3, tone: "slate" };
}

// Hex equivalents of each tone (Tailwind's ~500 shade), for chart libraries
// like Recharts that take real color values rather than class names.
export const TONE_HEX: Record<MetricTone, string> = {
  sky: "#0ea5e9",
  indigo: "#6366f1",
  emerald: "#10b981",
  violet: "#8b5cf6",
  orange: "#f97316",
  teal: "#14b8a6",
  pink: "#ec4899",
  rose: "#f43f5e",
  amber: "#f59e0b",
  slate: "#64748b",
};

/** True for rate/percentage-style metrics (CTR and its unique/outbound/inline
 * variants) — small enough and bounded enough (0-100ish) to show as a
 * progress-ring donut instead of a trend line. */
export function isRateMetric(fieldName: string): boolean {
  return /\bctr\b/i.test(fieldName);
}

/**
 * True for any metric that's already a ratio/average over its period —
 * summing it across days (as every plain total correctly is) produces a
 * meaningless, wildly inflated number. Confirmed live: summing ~30 days of
 * "Purchase ROAS" (≈6 each day) gave 188 instead of the real ~6. A superset
 * of isRateMetric — every rate metric belongs here too, but not everything
 * here is a bounded 0-100 "rate" fit for a donut (ROAS is unbounded, e.g.
 * 6.21x), so the two stay separate.
 */
export function isAveragedMetric(fieldName: string): boolean {
  return /\bctr\b|\broas\b|\bfrequency\b|\baverage\b|\bavg\b|\bper\b|\brate\b|\bpercentage\b/i.test(fieldName);
}
