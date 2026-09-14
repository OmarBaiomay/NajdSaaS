import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { useThemeStore, type ThemePreference } from "@/store/themeStore";

const OPTIONS: { value: ThemePreference; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export function ThemeToggle() {
  const { t } = useTranslation();
  const { preference, resolved, setPreference } = useThemeStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const CurrentIcon = resolved === "dark" ? Moon : Sun;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("theme.change")}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <CurrentIcon size={18} />
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {OPTIONS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setPreference(value);
                setOpen(false);
              }}
              className={clsx(
                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                preference === value && "text-brand-600 dark:text-brand-400"
              )}
            >
              <Icon size={14} />
              {t(`theme.${value}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
