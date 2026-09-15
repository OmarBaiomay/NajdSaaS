import type { ReactNode } from "react";
import { clsx } from "@/lib/clsx";
import type { MetricTone } from "@/lib/metricVisuals";

export type GlowAccent = MetricTone | "brand";

// Literal class strings (not template-built) so Tailwind's JIT scanner picks
// up every one of them regardless of which accent is chosen at runtime.
const ACCENTS: Record<GlowAccent, string> = {
  brand: "from-brand-500/60 via-brand-400/10 to-transparent",
  sky: "from-sky-500/60 via-sky-400/10 to-transparent",
  indigo: "from-indigo-500/60 via-indigo-400/10 to-transparent",
  emerald: "from-emerald-500/60 via-emerald-400/10 to-transparent",
  violet: "from-violet-500/60 via-violet-400/10 to-transparent",
  orange: "from-orange-500/60 via-orange-400/10 to-transparent",
  teal: "from-teal-500/60 via-teal-400/10 to-transparent",
  pink: "from-pink-500/60 via-pink-400/10 to-transparent",
  rose: "from-rose-500/60 via-rose-400/10 to-transparent",
  amber: "from-amber-500/60 via-amber-400/10 to-transparent",
  slate: "from-slate-500/60 via-slate-400/10 to-transparent",
};

/**
 * Futuristic stat card: gradient border glow + glassmorphism, used on the
 * Reporting Ninja dashboard where the "wow" factor matters more than on
 * plain admin screens.
 */
export function GlowCard({
  label,
  value,
  delta,
  icon,
  accent = "brand",
  className,
  footer,
  loading,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive: boolean };
  icon?: ReactNode;
  accent?: GlowAccent;
  className?: string;
  footer?: ReactNode;
  /** First-load only — shows a pulsing skeleton instead of the value/footer
   * so an empty account and "still fetching" never look identical. */
  loading?: boolean;
}) {
  return (
    <div className={clsx("group relative rounded-2xl p-[1px]", className)}>
      <div
        className={clsx(
          "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-70 transition-opacity duration-300 group-hover:opacity-100",
          ACCENTS[accent]
        )}
        aria-hidden
      />
      <div className="relative rounded-2xl bg-white/80 p-5 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          {icon && <span className="text-lg opacity-70">{icon}</span>}
        </div>
        {loading ? (
          <>
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </>
        ) : (
          <>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
            {delta && (
              <p className={clsx("mt-1 text-xs font-medium", delta.positive ? "text-emerald-500" : "text-red-500")}>
                {delta.positive ? "▲" : "▼"} {delta.value}
              </p>
            )}
            {footer && <div className="mt-2 -mx-1">{footer}</div>}
          </>
        )}
      </div>
    </div>
  );
}
