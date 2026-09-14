import type { RnField } from "./reportingNinja";

export interface MetricGroup {
  key: string;
  baseLabel: string;
  baseField?: RnField;
  tiers: { field: RnField; percent: number }[];
}

// Matches names like "Video Plays at 25%", "Video Plays 100%", "Completion @50%".
const PERCENT_SUFFIX = /^(.*?)\s*(?:@|at)?\s*(\d{1,3})\s*%$/i;

/**
 * Finds "completion breakdown" style metric families — a set of metrics that
 * share a base name and differ only by a trailing percentage tier (video
 * plays at 25/50/75/100%, and similar patterns from other integrations).
 * A donut chart communicates that relationship far better than N separate
 * flat number cards, so these are pulled out and grouped.
 */
export function groupMetricsByPercentTier(fields: RnField[]): { groups: MetricGroup[]; ungrouped: RnField[] } {
  const byBase = new Map<string, { field: RnField; percent: number }[]>();
  const tierFieldIds = new Set<string>();

  for (const field of fields) {
    const match = field.field_name.match(PERCENT_SUFFIX);
    if (match) {
      const base = match[1].trim().toLowerCase();
      const percent = Number(match[2]);
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base)!.push({ field, percent });
      tierFieldIds.add(field.field_id);
    }
  }

  const plainByBase = new Map<string, RnField>();
  for (const field of fields) {
    if (!tierFieldIds.has(field.field_id)) {
      plainByBase.set(field.field_name.trim().toLowerCase(), field);
    }
  }

  const groups: MetricGroup[] = [];
  for (const [base, tiers] of byBase) {
    if (tiers.length < 2) continue; // a single tier isn't a meaningful breakdown
    groups.push({
      key: base,
      baseLabel: tiers[0].field.field_name.replace(/\s*(?:@|at)?\s*\d{1,3}\s*%$/i, "").trim(),
      baseField: plainByBase.get(base),
      tiers: tiers.slice().sort((a, b) => a.percent - b.percent),
    });
  }

  const groupedIds = new Set(groups.flatMap((g) => g.tiers.map((t) => t.field.field_id)));
  const ungrouped = fields.filter((f) => !groupedIds.has(f.field_id));

  return { groups, ungrouped };
}
