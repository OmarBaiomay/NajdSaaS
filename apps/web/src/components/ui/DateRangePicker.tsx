import { useTranslation } from "react-i18next";
import { SearchableSelect, type SearchableOption } from "./SearchableSelect";

export interface DateRangeValue {
  preset: string;
  x?: number;
  start?: string;
  end?: string;
}

interface PresetDef {
  id: string;
  labelKey: string;
  range?: { preset: string; x?: number };
}

const PRESETS: PresetDef[] = [
  { id: "today", labelKey: "dateRange.today", range: { preset: "today" } },
  { id: "yesterday", labelKey: "dateRange.yesterday", range: { preset: "yesterday" } },
  { id: "last7", labelKey: "dateRange.last7", range: { preset: "lastxdays", x: 7 } },
  { id: "last14", labelKey: "dateRange.last14", range: { preset: "lastxdays", x: 14 } },
  { id: "last30", labelKey: "dateRange.last30", range: { preset: "lastxdays", x: 30 } },
  { id: "last90", labelKey: "dateRange.last90", range: { preset: "lastxdays", x: 90 } },
  { id: "thismonth", labelKey: "dateRange.thisMonth", range: { preset: "thismonth" } },
  { id: "lastmonth", labelKey: "dateRange.lastMonth", range: { preset: "lastmonth" } },
  { id: "thisyear", labelKey: "dateRange.thisYear", range: { preset: "thisyear" } },
  { id: "custom", labelKey: "dateRange.custom" },
];

export const DEFAULT_DATE_RANGE: DateRangeValue = { preset: "lastxdays", x: 30 };

function idForValue(value: DateRangeValue): string {
  if (value.preset === "custom") return "custom";
  const match = PRESETS.find((p) => p.range && p.range.preset === value.preset && p.range.x === value.x);
  return match?.id ?? "last30";
}

export function dateRangeLabel(value: DateRangeValue, t: (key: string) => string): string {
  if (value.preset === "custom") {
    return value.start && value.end ? `${value.start} → ${value.end}` : t("dateRange.custom");
  }
  const match = PRESETS.find((p) => p.range && p.range.preset === value.preset && p.range.x === value.x);
  return match ? t(match.labelKey) : t("dateRange.last30");
}

/** Drives the account-wide date range for an integration page — since every
 * card/chart/breakdown comes from one shared query, this one control governs
 * the whole page's time window, not just the trend chart next to it. */
export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const { t } = useTranslation();
  const selectedId = idForValue(value);
  const options: SearchableOption[] = PRESETS.map((p) => ({ value: p.id, label: t(p.labelKey) }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchableSelect
        value={selectedId}
        onChange={(id) => {
          if (id === "custom") {
            const today = new Date().toISOString().slice(0, 10);
            onChange({ preset: "custom", start: value.start ?? today, end: value.end ?? today });
            return;
          }
          const preset = PRESETS.find((p) => p.id === id);
          if (preset?.range) onChange(preset.range);
        }}
        options={options}
        className="w-40"
      />
      {selectedId === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={value.start ?? ""}
            max={value.end}
            onChange={(e) => onChange({ preset: "custom", start: e.target.value, end: value.end })}
            className="rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700"
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="date"
            value={value.end ?? ""}
            min={value.start}
            onChange={(e) => onChange({ preset: "custom", start: value.start, end: e.target.value })}
            className="rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700"
          />
        </div>
      )}
    </div>
  );
}
