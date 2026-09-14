import type { ReactNode } from "react";
import { clsx } from "@/lib/clsx";

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
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive: boolean };
  icon?: ReactNode;
  accent?: "brand" | "violet" | "teal" | "amber";
  className?: string;
  footer?: ReactNode;
}) {
  const accents: Record<string, string> = {
    brand: "from-brand-500/60 via-brand-400/10 to-transparent",
    violet: "from-violet-500/60 via-violet-400/10 to-transparent",
    teal: "from-teal-500/60 via-teal-400/10 to-transparent",
    amber: "from-amber-500/60 via-amber-400/10 to-transparent",
  };

  return (
    <div className={clsx("group relative rounded-2xl p-[1px]", className)}>
      <div
        className={clsx(
          "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-70 transition-opacity duration-300 group-hover:opacity-100",
          accents[accent]
        )}
        aria-hidden
      />
      <div className="relative rounded-2xl bg-white/80 p-5 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          {icon && <span className="text-lg opacity-70">{icon}</span>}
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        {delta && (
          <p className={clsx("mt-1 text-xs font-medium", delta.positive ? "text-emerald-500" : "text-red-500")}>
            {delta.positive ? "▲" : "▼"} {delta.value}
          </p>
        )}
        {footer && <div className="mt-2 -mx-1">{footer}</div>}
      </div>
    </div>
  );
}
