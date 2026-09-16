import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { MetricTone } from "@/lib/metricVisuals";

// Literal class strings (not template-built) so Tailwind's JIT scanner picks
// them all up regardless of which tone is chosen at runtime.
const LIGHT_ICON_STYLES: Record<MetricTone, string> = {
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300",
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300",
  pink: "bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function HeroMetricCard({
  label,
  value,
  icon: Icon,
  tone,
  variant = "light",
  footer,
  loading,
  menu,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: MetricTone;
  variant?: "light" | "solid";
  footer?: ReactNode;
  /** First-load only — pulsing skeleton instead of the value/footer. */
  loading?: boolean;
  /** Optional corner control (e.g. the swap-metric menu) — rendered over the
   * top-end corner so it never disturbs the icon/label layout below it. */
  menu?: ReactNode;
}) {
  if (variant === "solid") {
    return (
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white shadow-lg shadow-slate-900/20 dark:from-brand-950 dark:to-slate-900">
        {menu && <div className="absolute end-3 top-3 text-white/70 [&_svg]:stroke-current">{menu}</div>}
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-white/60">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Icon size={16} />
          </span>
        </div>
        {loading ? (
          <>
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-white/15" />
            <div className="mt-3 h-10 w-full animate-pulse rounded bg-white/10" />
          </>
        ) : (
          <>
            <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
            {footer && <div className="mt-2 -mx-1 opacity-90">{footer}</div>}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {menu && <div className="absolute end-3 top-3">{menu}</div>}
      <div className="flex items-center gap-3 pe-5">
        <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", LIGHT_ICON_STYLES[tone])}>
          <Icon size={16} />
        </span>
        <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
      {loading ? (
        <>
          <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </>
      ) : (
        <>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {footer && <div className="mt-2 -mx-1">{footer}</div>}
        </>
      )}
    </div>
  );
}
