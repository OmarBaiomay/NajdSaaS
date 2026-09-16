import type { DateRangeValue } from "@/components/ui/DateRangePicker";

/**
 * Rough day-count for a date range — used to size a query's `limit` so a
 * long range (e.g. "This year" ≈ 365 daily rows) isn't silently truncated to
 * a short range's row cap. Confirmed real bug: a flat `limit: 100` was
 * cutting a full year down to its first ~100 days, understating every total
 * on the page (and looking like the page had "gotten stuck" once the range
 * grew past what 100 rows could hold). Doesn't need to be exact — only
 * never an undercount.
 */
export function estimateDateRangeDays(range: DateRangeValue): number {
  switch (range.preset) {
    case "today":
    case "yesterday":
      return 1;
    case "lastxdays":
      return range.x ?? 30;
    case "thismonth":
    case "lastmonth":
      return 31;
    case "thisyear":
      return 366;
    case "custom": {
      if (range.start && range.end) {
        const start = new Date(range.start).getTime();
        const end = new Date(range.end).getTime();
        const days = Math.round((end - start) / 86_400_000) + 1;
        if (Number.isFinite(days) && days > 0) return days;
      }
      return 366; // unknown custom range — don't undercut it
    }
    default:
      return 366;
  }
}
