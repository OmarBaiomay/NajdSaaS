import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LoadingBar } from "@/components/ui/LoadingBar";

export interface BreakdownColumn {
  id: string;
  label: string;
  /** "number" (default) reads the cell as a number for both sorting and the
   * default renderer; "text" keeps it a string (e.g. "Ad status") — sorting
   * still works for either via the same generic comparator below. */
  type?: "number" | "text";
  render?: (value: number | string) => ReactNode;
}

/**
 * A searchable, sortable, paginated "breakdown by X" table — the same shape
 * used for the per-integration Campaigns table and reused here for any
 * hand-built integration page (Google Analytics' "Session source/medium"
 * table and whatever else follows it) so this pattern isn't reimplemented
 * per page.
 */
export function BreakdownTable({
  title,
  subtitle,
  dimensionLabel,
  dimensionField,
  columns,
  rows,
  loading,
  emptyLabel,
  searchPlaceholder,
  pageSize = 20,
  defaultSortField,
}: {
  title: string;
  subtitle?: ReactNode;
  dimensionLabel: string;
  dimensionField: string;
  columns: BreakdownColumn[];
  rows: Record<string, string | number>[];
  loading?: boolean;
  emptyLabel: string;
  searchPlaceholder: string;
  pageSize?: number;
  /** Which column sorts first by default — falls back to the first column,
   * which isn't always right once a table has a leading text column (e.g.
   * "Ad status") that shouldn't be what the table opens sorted by. */
  defaultSortField?: string;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ field: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);

  const effectiveSort = sort ?? { field: defaultSortField ?? columns[0]?.id ?? dimensionField, dir: "desc" as const };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => String(r[dimensionField] ?? "").toLowerCase().includes(term));
  }, [rows, dimensionField, search]);

  const sorted = useMemo(() => {
    const { field, dir } = effectiveSort;
    const sign = dir === "asc" ? 1 : -1;
    return filtered.slice().sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (typeof av === "number" || typeof bv === "number") {
        return ((Number(av) || 0) - (Number(bv) || 0)) * sign;
      }
      return String(av ?? "").localeCompare(String(bv ?? "")) * sign;
    });
  }, [filtered, effectiveSort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const paged = sorted.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize);

  const toggleSort = (field: string) => {
    setSort((prev) => (prev?.field === field ? { field, dir: prev.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" }));
    setPage(0);
  };

  const sortIndicator = (field: string) => effectiveSort.field === field && (effectiveSort.dir === "asc" ? "▲" : "▼");

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</h2>
          {subtitle}
        </div>
        <div className="relative w-full max-w-xs sm:w-64">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-transparent py-1.5 ps-8 pe-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
          />
        </div>
      </div>

      {loading && sorted.length === 0 ? (
        <div className="p-4">
          <LoadingBar />
        </div>
      ) : sorted.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-3 text-start font-medium">
                    <button
                      onClick={() => toggleSort(dimensionField)}
                      className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {dimensionLabel}
                      {sortIndicator(dimensionField)}
                    </button>
                  </th>
                  {columns.map((col) => (
                    <th key={col.id} className="px-4 py-3 text-start font-medium">
                      <button
                        onClick={() => toggleSort(col.id)}
                        className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {col.label}
                        {sortIndicator(col.id)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paged.map((row, i) => (
                  <tr key={`${row[dimensionField]}-${i}`}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {String(row[dimensionField] ?? "—")}
                    </td>
                    {columns.map((col) => {
                      const value = col.type === "text" ? String(row[col.id] ?? "—") : Number(row[col.id]) || 0;
                      return (
                        <td key={col.id} className="px-4 py-3">
                          {col.render ? col.render(value) : typeof value === "number" ? value.toLocaleString() : value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <p className="text-xs text-slate-400">
              {t("integrations.paginationRange", {
                from: clampedPage * pageSize + 1,
                to: Math.min(sorted.length, (clampedPage + 1) * pageSize),
                total: sorted.length,
              })}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={clampedPage === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={clampedPage >= pageCount - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
