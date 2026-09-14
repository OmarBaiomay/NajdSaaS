export interface BarItem {
  label: string;
  value: number;
}

/** Ranked horizontal bars — used to turn a large "family" of related metrics
 * (e.g. every action type Reporting Ninja tracks) into a scannable top list
 * instead of dozens of flat cards. */
export function TopMetricsBarList({
  items,
  maxItems = 8,
  moreLabel,
}: {
  items: BarItem[];
  maxItems?: number;
  moreLabel?: (hiddenCount: number) => string;
}) {
  const sorted = items.slice().sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, maxItems);
  const hiddenCount = sorted.length - shown.length;
  const max = Math.max(...shown.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {shown.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-slate-600 dark:text-slate-300">{item.label}</span>
            <span className="shrink-0 font-medium text-slate-900 dark:text-white">
              {item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
      {hiddenCount > 0 && (
        <p className="pt-1 text-xs text-slate-400">{moreLabel ? moreLabel(hiddenCount) : `+${hiddenCount}`}</p>
      )}
    </div>
  );
}
