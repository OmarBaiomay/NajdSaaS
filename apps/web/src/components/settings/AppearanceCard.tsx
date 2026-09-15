import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { clsx } from "@/lib/clsx";
import { useThemeStore, type ThemePreference } from "@/store/themeStore";
import { ACCENT_PRESETS } from "@/lib/themePresets";

const MODES: { value: ThemePreference; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

/** Appearance settings shared by both the Agency and Tenant settings pages —
 * mode (light/dark/system) and accent color both apply app-wide via
 * themeStore, so there's one implementation instead of two near-duplicates. */
export function AppearanceCard() {
  const { t } = useTranslation();
  const { preference, accent, setPreference, setAccent } = useThemeStore();

  return (
    <Card>
      <h2 className="text-base font-semibold">{t("appearance.title")}</h2>
      <p className="text-sm text-slate-500">{t("appearance.subtitle")}</p>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">{t("appearance.mode")}</p>
        <div className="inline-flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
          {MODES.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreference(value)}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                preference === value
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Icon size={14} />
              {t(`theme.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">{t("appearance.accentColor")}</p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((preset) => {
            const selected = accent === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAccent(preset.id)}
                aria-label={t(preset.labelKey)}
                aria-pressed={selected}
                title={t(preset.labelKey)}
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-all dark:ring-offset-slate-900",
                  selected ? "ring-slate-400 dark:ring-slate-300" : "ring-transparent hover:ring-slate-200 dark:hover:ring-slate-700"
                )}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: preset.swatch }}
                >
                  {selected && <Check size={16} className="text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
