import { useEffect, useState, type ReactNode } from "react";
import { HeroMetricCard } from "@/components/ui/HeroMetricCard";
import { HeroMetricSwapMenu } from "@/components/ui/HeroMetricSwapMenu";
import { Sparkline } from "@/components/charts/Sparkline";
import { getMetricVisual } from "@/lib/metricVisuals";

export interface HeroCandidate {
  /** Stable identifier used for swap tracking and as the swap menu's option
   * id — doesn't need to be a real Reporting Ninja field id. */
  key: string;
  label: string;
  /** English keyword fed to getMetricVisual for icon/tone — kept separate
   * from `label` since label may already be localized (Arabic), and the
   * icon-matching keywords are English-only. */
  visualKeyword: string;
  format: (v: number) => ReactNode;
  value: number;
  /** Daily series for the sparkline footer — empty/all-zero hides it. */
  series: number[];
}

/**
 * The same swappable hero-card row the generic (Meta Ads) integration page
 * has — icon-badge cards with a sparkline, a ⋮ menu on each to swap that
 * slot for a different metric, first card in the dark "solid" variant —
 * built as one reusable piece so every hand-built custom page (GA4, Google
 * Ads, Snapchat Ads, Meta Ads…) gets the same default-view-plus-swap
 * behavior instead of reimplementing it per page.
 */
export function SwappableHeroRow({
  defaultKeys,
  candidates,
  loading,
  resetKey,
  columnsClass = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
}: {
  defaultKeys: string[];
  candidates: HeroCandidate[];
  loading?: boolean;
  /** Overrides reset whenever this changes (e.g. the selected account) —
   * an override picked for one account's field catalog may not even apply
   * to another. */
  resetKey: string;
  columnsClass?: string;
}) {
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  useEffect(() => {
    setOverrides({});
  }, [resetKey]);

  const byKey = new Map(candidates.map((c) => [c.key, c]));
  const effectiveKeys = defaultKeys.map((k, i) => overrides[i] ?? k);
  const usedKeys = new Set(effectiveKeys);

  return (
    <div className={columnsClass}>
      {effectiveKeys.map((key, i) => {
        const candidate = byKey.get(key);
        if (!candidate) return null;
        const visual = getMetricVisual(candidate.visualKeyword);
        // Anything with data, not already headlining another slot —
        // swapping one card can never create a duplicate.
        const options = candidates.filter((c) => c.key === key || !usedKeys.has(c.key));

        return (
          <HeroMetricCard
            key={`${i}-${key}`}
            label={candidate.label}
            value={candidate.format(candidate.value)}
            icon={visual.icon}
            tone={visual.tone}
            variant={i === 0 ? "solid" : "light"}
            footer={candidate.series.some((v) => v !== 0) ? <Sparkline data={candidate.series} /> : undefined}
            loading={loading}
            menu={
              options.length > 1 ? (
                <HeroMetricSwapMenu
                  value={key}
                  options={options.map((o) => ({ field_id: o.key, field_name: o.label }))}
                  onSelect={(fieldId) => setOverrides((prev) => ({ ...prev, [i]: fieldId }))}
                />
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}
