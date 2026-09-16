import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreVertical, Check } from "lucide-react";
import { clsx } from "@/lib/clsx";

interface SwapOption {
  field_id: string;
  field_name: string;
}

/** Small corner menu on a hero card letting the user swap that slot's metric
 * for any other metric that actually has data on this account — the default
 * 5 cards are a good starting point, not the only numbers worth headlining. */
export function HeroMetricSwapMenu({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: SwapOption[];
  onSelect: (fieldId: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = options.filter((o) => o.field_name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={t("integrations.swapMetric")}
        title={t("integrations.swapMetric")}
        className="flex h-6 w-6 items-center justify-center rounded-md text-current opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="w-full border-b border-slate-100 bg-transparent px-3 py-2 text-xs outline-none dark:border-slate-800"
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">{t("common.noResults")}</p>}
            {filtered.map((o) => (
              <button
                key={o.field_id}
                type="button"
                onClick={() => {
                  onSelect(o.field_id);
                  setOpen(false);
                  setSearch("");
                }}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-xs hover:bg-slate-100 dark:hover:bg-slate-800",
                  o.field_id === value && "text-brand-600 dark:text-brand-400"
                )}
              >
                <span className="truncate">{o.field_name}</span>
                {o.field_id === value && <Check size={12} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
