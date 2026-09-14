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
const KEYWORD_VISUALS: { test: RegExp; icon: LucideIcon; tone: MetricTone }[] = [
  { test: /impression/i, icon: Eye, tone: "sky" },
  { test: /click/i, icon: MousePointerClick, tone: "indigo" },
  { test: /spend|cost|budget/i, icon: Wallet, tone: "emerald" },
  { test: /reach|audience|follower|subscriber/i, icon: Users, tone: "violet" },
  { test: /conversion|purchase|result|lead/i, icon: Target, tone: "orange" },
  { test: /ctr|rate|percentage/i, icon: Percent, tone: "teal" },
  { test: /like|engagement|reaction/i, icon: ThumbsUp, tone: "pink" },
  { test: /share/i, icon: Share2, tone: "teal" },
  { test: /comment/i, icon: MessageCircle, tone: "rose" },
  { test: /video|play|view/i, icon: PlayCircle, tone: "rose" },
  { test: /revenue|roas|value|sale/i, icon: TrendingUp, tone: "emerald" },
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
