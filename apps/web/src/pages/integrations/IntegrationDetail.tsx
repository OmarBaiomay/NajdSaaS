import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlowCard } from "@/components/ui/GlowCard";
import { HeroMetricCard } from "@/components/ui/HeroMetricCard";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { DateRangePicker, dateRangeLabel, DEFAULT_DATE_RANGE, type DateRangeValue } from "@/components/ui/DateRangePicker";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { MetricDonutChart } from "@/components/charts/MetricDonutChart";
import { TopMetricsBarList } from "@/components/charts/TopMetricsBarList";
import { getIntegrationDetail, listConnections, listFields, runQuery, type RnField } from "@/lib/reportingNinja";
import { getIntegrationVisual } from "@/lib/integrationIcons";
import { groupMetricsByPercentTier } from "@/lib/metricGrouping";
import { groupMetricsByNamespace } from "@/lib/metricNamespaceGrouping";
import { getMetricVisual, pickSimplestMatch, HERO_PRIORITY } from "@/lib/metricVisuals";
import { pickTimeDimension } from "@/lib/timeDimension";
import { getDefaultAccount, setDefaultAccount } from "@/lib/defaultAccounts";
import { useAuthStore } from "@/store/authStore";
import { useViewAsStore } from "@/store/viewAsStore";

const GRID_ACCENTS = ["brand", "violet", "teal", "amber", "sky", "indigo", "emerald", "orange", "pink", "rose"] as const;
const HERO_COUNT = 5;

// Some providers (Google Ads in particular) reject a query that mixes
// metrics from incompatible resource categories in one request. Rather than
// ask the user to pick metrics, we request them all at once and, if the
// provider rejects the combination, bisect the field list and retry each
// half in parallel — recursing only into the half(s) that actually fail.
// This isolates the handful of genuinely incompatible fields (usually a
// few percent) while fetching the rest in as few round trips as possible.
const MAX_QUERY_CALLS = 120;

interface BisectResult {
  rows: Record<string, string | number>[];
  unavailable: string[];
}

async function fetchMetricsBisecting(
  fields: string[],
  runOne: (fields: string[]) => Promise<Record<string, string | number>[]>,
  dimensionField: string,
  callBudget: { remaining: number }
): Promise<BisectResult> {
  if (fields.length === 0) return { rows: [], unavailable: [] };
  if (callBudget.remaining <= 0) return { rows: [], unavailable: fields };
  callBudget.remaining -= 1;

  try {
    const rows = await runOne(fields);
    return { rows, unavailable: [] };
  } catch {
    if (fields.length === 1) return { rows: [], unavailable: fields };
    const mid = Math.ceil(fields.length / 2);
    const [a, b] = await Promise.all([
      fetchMetricsBisecting(fields.slice(0, mid), runOne, dimensionField, callBudget),
      fetchMetricsBisecting(fields.slice(mid), runOne, dimensionField, callBudget),
    ]);
    const merged = new Map<string, Record<string, string | number>>();
    for (const row of [...a.rows, ...b.rows]) {
      const key = String(row[dimensionField]);
      merged.set(key, { ...merged.get(key), ...row });
    }
    return { rows: Array.from(merged.values()), unavailable: [...a.unavailable, ...b.unavailable] };
  }
}

/** Picks up to `count` "headline" metrics by keyword priority (impressions,
 * clicks, spend…), falling back to the highest-total remaining metrics. */
function pickHeroMetrics(fields: RnField[], totals: Map<string, number>, count: number): RnField[] {
  const chosen: RnField[] = [];
  const chosenIds = new Set<string>();

  for (const pattern of HERO_PRIORITY) {
    if (chosen.length >= count) break;
    const candidates = fields.filter(
      (f) => !chosenIds.has(f.field_id) && (pattern.test(f.field_id) || pattern.test(f.field_name))
    );
    const match = pickSimplestMatch(candidates);
    if (match) {
      const field = fields.find((f) => f.field_id === match.field_id)!;
      chosen.push(field);
      chosenIds.add(field.field_id);
    }
  }

  if (chosen.length < count) {
    const remaining = fields
      .filter((f) => !chosenIds.has(f.field_id))
      .sort((a, b) => (totals.get(b.field_id) ?? 0) - (totals.get(a.field_id) ?? 0));
    for (const f of remaining) {
      if (chosen.length >= count) break;
      chosen.push(f);
      chosenIds.add(f.field_id);
    }
  }

  return chosen;
}

export default function IntegrationDetail() {
  const { integrationId = "" } = useParams<{ integrationId: string }>();
  const { t } = useTranslation();
  const visual = getIntegrationVisual(integrationId);

  const [connectionKey, setConnectionKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dataView, setDataView] = useState("");

  // Scoped per tenant so an agency user browsing different tenants via
  // "View as" never leaks one tenant's default account into another's.
  const authTenantId = useAuthStore((s) => s.user?.tenantId);
  const viewAsTenantId = useViewAsStore((s) => s.tenantId);
  const accountScope = viewAsTenantId ?? authTenantId ?? "self";

  const selectAccount = (value: string, remember = true) => {
    const [ck, aid] = value.split("::");
    setConnectionKey(ck ?? "");
    setAccountId(aid ?? "");
    if (remember && ck && aid) setDefaultAccount(accountScope, integrationId, value);
  };

  const [metricSearch, setMetricSearch] = useState("");
  const [chartMetric, setChartMetric] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const dateRangeReady = dateRange.preset !== "custom" || (!!dateRange.start && !!dateRange.end);

  // Some integrations (Google Ads, Microsoft Ads, YouTube, LinkedIn…) require
  // a data_view on both /fields and /query — discover that up front.
  const { data: detail } = useQuery({
    queryKey: ["rn-integration-detail", integrationId],
    queryFn: () => getIntegrationDetail(integrationId),
  });
  const dataViews = detail?.data_views ?? null;
  const needsDataView = !!dataViews && dataViews.length > 0;
  const dataViewOptions: SearchableOption[] = dataViews?.map((dv) => ({ value: dv.id, label: dv.name })) ?? [];
  const dataViewReady = !needsDataView || !!dataView;

  // Integrations that require account-level settings (e.g. facebook_ads'
  // attribution_window) expose them with a recommended_value — use that as
  // the default so a first-time user doesn't have to configure anything.
  const defaultSettings = useMemo(() => {
    if (!detail?.settings?.length) return undefined;
    return Object.fromEntries(detail.settings.map((s) => [s.id, s.recommended_value]));
  }, [detail]);

  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["rn-connections", integrationId],
    queryFn: () => listConnections(integrationId),
  });

  const accountOptions: SearchableOption[] =
    connections?.flatMap((c) =>
      c.accounts.map((a) => ({
        value: `${c.connection_key}::${a.account_id}`,
        label: a.account_name,
        description: c.connection_name !== a.account_name ? c.connection_name : undefined,
      }))
    ) ?? [];

  // Auto-select the account remembered from last time this integration was
  // opened (scoped per tenant), once the account list has loaded.
  useEffect(() => {
    if (accountId || accountOptions.length === 0) return;
    const saved = getDefaultAccount(accountScope, integrationId);
    if (saved && accountOptions.some((o) => o.value === saved)) {
      selectAccount(saved, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountOptions, accountScope, integrationId]);

  const { data: fieldsData } = useQuery({
    queryKey: ["rn-fields", integrationId, dataView],
    queryFn: () => listFields(integrationId, dataView || undefined),
    enabled: dataViewReady,
  });

  const metricFields = useMemo(() => fieldsData?.fields.filter((f) => f.dim_met === "metric") ?? [], [fieldsData]);
  // Always chart against an actual date field — the API's own
  // "default_dimension" is frequently a non-time field (account/campaign
  // name), which would collapse a 30-day trend into a single point.
  const dimensionField = useMemo(
    () => pickTimeDimension(fieldsData?.fields ?? [], fieldsData?.default_dimension ?? "day"),
    [fieldsData]
  );
  const metricIds = useMemo(() => metricFields.map((f) => f.field_id), [metricFields]);

  const {
    data: queryResult,
    isFetching: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: [
      "rn-query-all",
      integrationId,
      connectionKey,
      accountId,
      dataView,
      metricIds.join(","),
      JSON.stringify(dateRange),
    ],
    queryFn: async () => {
      const runOne = (fields: string[]) =>
        runQuery<Record<string, string | number>>({
          integration_id: integrationId,
          connection_key: connectionKey,
          account_id: accountId,
          ...(dataView ? { data_view: dataView } : {}),
          ...(defaultSettings ? { settings: defaultSettings } : {}),
          fields: [dimensionField, ...fields],
          date_range: dateRange as unknown as Record<string, unknown>,
          limit: 100,
        });

      const result = await fetchMetricsBisecting(metricIds, runOne, dimensionField, {
        remaining: MAX_QUERY_CALLS,
      });

      if (result.rows.length === 0 && result.unavailable.length === metricIds.length) {
        throw new Error("Query failed for every metric");
      }
      return result;
    },
    enabled: dataViewReady && dateRangeReady && !!connectionKey && !!accountId && metricIds.length > 0,
  });

  const rows = queryResult?.rows;
  const hasData = !!queryResult; // the query has resolved at least once (vs. the pre-account skeleton)

  const sortedRows = useMemo(
    () => (rows ?? []).slice().sort((a, b) => String(a[dimensionField]).localeCompare(String(b[dimensionField]))),
    [rows, dimensionField]
  );

  const totalFor = (fieldId: string) => sortedRows.reduce((sum, row) => sum + (Number(row[fieldId]) || 0), 0);

  const availableMetrics = useMemo(
    () => metricFields.filter((f) => !queryResult?.unavailable.includes(f.field_id)),
    [metricFields, queryResult]
  );

  const totalsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of availableMetrics) map.set(f.field_id, totalFor(f.field_id));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableMetrics, sortedRows]);

  // Metric families like "Video Plays at 25/50/75/100%" tell a much clearer
  // story as a donut than as four disconnected number cards — pull those out.
  const { groups: allDonutGroups, ungrouped } = useMemo(
    () => groupMetricsByPercentTier(availableMetrics),
    [availableMetrics]
  );
  // Once real data is in, drop a breakdown entirely if every tier is zero —
  // no point showing an empty donut. Before data loads, keep all of them
  // (the skeleton state intentionally shows the full page shape).
  const donutGroups = useMemo(
    () =>
      !hasData ? allDonutGroups : allDonutGroups.filter((g) => g.tiers.some((t) => totalFor(t.field.field_id) !== 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allDonutGroups, hasData, sortedRows]
  );

  const heroMetrics = useMemo(() => pickHeroMetrics(ungrouped, totalsById, HERO_COUNT), [ungrouped, totalsById]);
  const heroIds = useMemo(() => new Set(heroMetrics.map((f) => f.field_id)), [heroMetrics]);

  // Related metrics namespaced as "<family>:<type>" (e.g. actions:link_click,
  // actions:purchase, actions:lead all under "actions") are far more useful
  // ranked together as a top-N breakdown than as dozens of flat cards.
  const allNamespaceGroups = useMemo(() => groupMetricsByNamespace(ungrouped), [ungrouped]);
  const namespaceGroups = useMemo(
    () =>
      !hasData
        ? allNamespaceGroups
        : allNamespaceGroups.filter((g) => g.members.some((f) => totalFor(f.field_id) !== 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allNamespaceGroups, hasData, sortedRows]
  );
  const namespaceGroupedIds = useMemo(
    () => new Set(allNamespaceGroups.flatMap((g) => g.members.map((f) => f.field_id))),
    [allNamespaceGroups]
  );

  const restMetrics = useMemo(
    () => ungrouped.filter((f) => !heroIds.has(f.field_id) && !namespaceGroupedIds.has(f.field_id)),
    [ungrouped, heroIds, namespaceGroupedIds]
  );

  const [showZeroMetrics, setShowZeroMetrics] = useState(false);
  const searchedMetrics = useMemo(
    () => restMetrics.filter((f) => f.field_name.toLowerCase().includes(metricSearch.trim().toLowerCase())),
    [restMetrics, metricSearch]
  );
  // Hide metrics with no data at all by default — a page of fifty "0" cards
  // for conversion types this account never uses isn't useful. Searching or
  // toggling "show all" overrides that, since the user is looking for it on
  // purpose then.
  const isZero = (f: RnField) => (totalsById.get(f.field_id) ?? 0) === 0;
  const visibleMetrics = useMemo(() => {
    if (!hasData || showZeroMetrics || metricSearch.trim()) return searchedMetrics;
    return searchedMetrics.filter((f) => !isZero(f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchedMetrics, hasData, showZeroMetrics, metricSearch, totalsById]);
  const hiddenZeroCount = hasData && !showZeroMetrics && !metricSearch.trim()
    ? searchedMetrics.length - visibleMetrics.length
    : 0;

  const chartOptions: SearchableOption[] = availableMetrics.map((f) => ({ value: f.field_id, label: f.field_name }));
  const effectiveChartMetric = chartMetric || fieldsData?.default_metric || heroMetrics[0]?.field_id || "";
  const chartMetricField = availableMetrics.find((f) => f.field_id === effectiveChartMetric);
  const primaryChartData = sortedRows.map((row) => ({
    label: String(row[dimensionField]),
    value: Number(row[effectiveChartMetric]) || 0,
  }));

  // Donuts and bar-list breakdowns share one grid so a single leftover group
  // (e.g. only one "at N%" family on this account) doesn't leave a dead
  // half-empty row — they just sit next to whatever else is available.
  type BreakdownCard =
    | { type: "donut"; key: string; title: string; subtitle?: string; slices: { label: string; value: number }[]; centerValue?: string; centerLabel?: string }
    | { type: "bars"; key: string; title: string; items: { label: string; value: number }[] };

  const breakdownCards: BreakdownCard[] = [
    ...donutGroups.map((group): BreakdownCard => {
      const baseTotal = group.baseField ? totalFor(group.baseField.field_id) : undefined;
      return {
        type: "donut",
        key: group.key,
        title: t("integrations.breakdownOf", { name: group.baseLabel }),
        subtitle: baseTotal !== undefined ? t("integrations.ofTotal", { total: baseTotal.toLocaleString() }) : undefined,
        slices: group.tiers.map((tier) => ({ label: `${tier.percent}%`, value: totalFor(tier.field.field_id) })),
        centerValue: baseTotal?.toLocaleString(),
        centerLabel: group.baseLabel,
      };
    }),
    ...namespaceGroups.map(
      (group): BreakdownCard => ({
        type: "bars",
        key: group.key,
        title: t("integrations.topBreakdownOf", { name: group.label }),
        items: group.members.map((f) => ({ label: f.field_name, value: totalFor(f.field_id) })),
      })
    ),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to=".."
            relative="path"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${visual.bg} ${visual.color}`}>
            {visual.icon}
          </span>
          <h1 className="text-lg font-semibold capitalize">{integrationId.replace(/_/g, " ")}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {needsDataView && (
            <SearchableSelect
              placeholder={t("integrations.dataView")}
              value={dataView}
              onChange={setDataView}
              options={dataViewOptions}
              className="w-44"
            />
          )}
          <SearchableSelect
            placeholder={connectionsLoading ? t("common.loading") : t("integrations.account")}
            value={accountId ? `${connectionKey}::${accountId}` : ""}
            onChange={(v) => selectAccount(v)}
            options={accountOptions}
            className="w-56"
          />
        </div>
      </div>

      {needsDataView && !dataView && (
        <Card className="text-center text-sm text-slate-500">{t("integrations.selectDataView")}</Card>
      )}

      {!accountId && !connectionsLoading && (connections?.length ?? 0) === 0 && (
        <Card className="text-center text-sm text-slate-500">{t("integrations.noAccounts")}</Card>
      )}

      {queryError && <p className="text-sm text-red-500">{t("integrations.loadError")}</p>}

      {/* The whole layout renders as soon as we know the field catalog (no
          account needed for that) — values just sit at 0 until an account is
          chosen, then update in place once the query resolves. */}
      {metricFields.length > 0 && (
        <>
          {!accountId && (
            <p className="text-xs text-slate-400">{t("integrations.chooseAccountHint")}</p>
          )}
          {queryLoading && <p className="text-xs text-slate-400">{t("integrations.updatingData")}</p>}
          {!queryLoading && (queryResult?.unavailable.length ?? 0) > 0 && (
            <p className="text-xs text-slate-400">
              {t("integrations.someMetricsUnavailable", { count: queryResult!.unavailable.length })}
            </p>
          )}

          {heroMetrics.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {heroMetrics.map((field, i) => {
                const series = sortedRows.map((row) => Number(row[field.field_id]) || 0);
                const { icon: Icon, tone } = getMetricVisual(field.field_name);
                return (
                  <HeroMetricCard
                    key={field.field_id}
                    label={field.field_name}
                    value={(totalsById.get(field.field_id) ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                    icon={Icon}
                    tone={tone}
                    variant={i === 0 ? "solid" : "light"}
                    footer={series.some((v) => v !== 0) ? <Sparkline data={series} /> : undefined}
                  />
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {chartMetricField?.field_name ?? effectiveChartMetric} · {dateRangeLabel(dateRange, t)}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
                <SearchableSelect
                  value={effectiveChartMetric}
                  onChange={setChartMetric}
                  options={chartOptions}
                  className="w-56"
                />
              </div>
            </div>
            <RevenueChart data={primaryChartData} />
            <p className="mt-2 text-xs text-slate-400">{t("integrations.dateRangeAppliesToAll")}</p>
          </div>

          {breakdownCards.length > 0 && (
            <div className={`grid grid-cols-1 gap-4 ${breakdownCards.length > 1 ? "lg:grid-cols-2" : ""}`}>
              {breakdownCards.map((card) => (
                <div
                  key={card.key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h2 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{card.title}</h2>
                  {card.type === "donut" ? (
                    <>
                      {card.subtitle && <p className="mb-2 text-xs text-slate-400">{card.subtitle}</p>}
                      <MetricDonutChart slices={card.slices} centerValue={card.centerValue} centerLabel={card.centerLabel} />
                    </>
                  ) : (
                    <div className="mt-3">
                      <TopMetricsBarList items={card.items} moreLabel={(count) => t("integrations.moreItems", { count })} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={metricSearch}
                onChange={(e) => setMetricSearch(e.target.value)}
                placeholder={t("integrations.searchMetrics")}
                className="w-full rounded-lg border border-slate-300 bg-transparent py-2 ps-9 pe-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            {hiddenZeroCount > 0 && (
              <button
                onClick={() => setShowZeroMetrics(true)}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                {t("integrations.showZeroMetrics", { count: hiddenZeroCount })}
              </button>
            )}
            {showZeroMetrics && (
              <button
                onClick={() => setShowZeroMetrics(false)}
                className="text-xs font-medium text-slate-400 hover:underline"
              >
                {t("integrations.hideZeroMetrics")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleMetrics.map((field, i) => {
              const series = sortedRows.map((row) => Number(row[field.field_id]) || 0);
              const { icon: Icon, tone } = getMetricVisual(field.field_name);
              return (
                <GlowCard
                  key={field.field_id}
                  label={field.field_name}
                  value={(totalsById.get(field.field_id) ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                  icon={<Icon size={16} />}
                  accent={tone ?? GRID_ACCENTS[i % GRID_ACCENTS.length]}
                  footer={series.some((v) => v !== 0) ? <Sparkline data={series} /> : undefined}
                />
              );
            })}
          </div>

          {visibleMetrics.length === 0 && heroMetrics.length === 0 && (
            <Card className="text-center text-sm text-slate-500">{t("common.noResults")}</Card>
          )}
        </>
      )}
    </div>
  );
}
