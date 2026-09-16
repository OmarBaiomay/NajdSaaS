/**
 * Groups rows by a dimension field into the top N by a metric field, folding
 * everything past that into a single "Others" slice — matches how Looker
 * Studio (and most BI tools) render a category pie/donut with a long tail.
 */
export function topNWithOthers(
  rows: Record<string, string | number>[],
  dimensionField: string,
  metricField: string,
  n: number,
  othersLabel: string
): { label: string; value: number }[] {
  const sorted = rows
    .map((r) => ({ label: String(r[dimensionField] ?? "—"), value: Number(r[metricField]) || 0 }))
    .filter((r) => r.value !== 0)
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= n) return sorted;

  const top = sorted.slice(0, n);
  const rest = sorted.slice(n).reduce((sum, r) => sum + r.value, 0);
  return rest > 0 ? [...top, { label: othersLabel, value: rest }] : top;
}
