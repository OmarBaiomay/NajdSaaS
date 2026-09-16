import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Search,
  BarChart3,
  AreaChart as AreaChartIcon,
  LineChart as LineChartIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlowCard } from "@/components/ui/GlowCard";
import { HeroMetricCard } from "@/components/ui/HeroMetricCard";
import { LoadingBar } from "@/components/ui/LoadingBar";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { DateRangePicker, dateRangeLabel, DEFAULT_DATE_RANGE, type DateRangeValue } from "@/components/ui/DateRangePicker";
import { RevenueChart, type ChartShape } from "@/components/charts/RevenueChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { MiniBarChart } from "@/components/charts/MiniBarChart";
import { MiniAreaChart } from "@/components/charts/MiniAreaChart";
import { MiniProgressDonut } from "@/components/charts/MiniProgressDonut";
import { MetricDonutChart } from "@/components/charts/MetricDonutChart";
import { TopMetricsBarList } from "@/components/charts/TopMetricsBarList";
import { getIntegrationDetail, listConnections, listFields, runQuery, type RnField } from "@/lib/reportingNinja";
import { getIntegrationVisual } from "@/lib/integrationIcons";
import { groupMetricsByPercentTier } from "@/lib/metricGrouping";
import { groupMetricsByNamespace } from "@/lib/metricNamespaceGrouping";
import { getMetricVisual, isRateMetric, pickSimplestMatch, TONE_HEX, HERO_PRIORITY } from "@/lib/metricVisuals";
import { pickTimeDimension } from "@/lib/timeDimension";
import { pickCampaignDimension } from "@/lib/campaignDimension";
import { estimateDateRangeDays } from "@/lib/dateRangeDays";
import { getDefaultAccount, setDefaultAccount } from "@/lib/defaultAccounts";
import { isCurrencyMetric } from "@/lib/currency";
import { CurrencyAmount } from "@/components/ui/SarSymbol";
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

// Some error codes mean the whole connection/query is broken (expired
// provider auth, our key being invalid, rate limiting) — splitting the
// field list can never fix those, so retrying dozens of times just wastes
// calls. Only bisect on genuine "this specific combination of fields is
// invalid" errors; anything else aborts immediately and surfaces as a
// real, actionable error instead of a vague "some metrics unavailable".
const NON_SPLITTABLE_CODES = new Set(["AUTH_EXPIRED", "AUTH_INVALID", "NOT_CONNECTED", "RATE_LIMITED"]);

function isNonSplittableError(err: unknown): boolean {
  if (!isAxiosError(err)) return false;
  const code = (err.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
  return !!code && NON_SPLITTABLE_CODES.has(code);
}

export function extractApiErrorMessage(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined;
  return (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
}

// On failure, split into this many pieces (not just 2) — since sibling
// pieces are all fetched concurrently, wall-clock time is driven by
// recursion *depth*, not total call count. Widening the fan-out from 2 to
// 8 cuts a large field list's worst-case depth from ~log2(N) to ~log8(N)
// (e.g. 250 fields: 8 rounds → 3), which is the actual "why is this slow"
// fix — most of those 8 rounds in the old binary approach were spent on
// batches doomed to fail again, not making real progress.
const SPLIT_FACTOR = 8;

function splitInto<T>(items: T[], parts: number): T[][] {
  const size = Math.ceil(items.length / parts);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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
  } catch (err) {
    if (isNonSplittableError(err)) throw err;
    if (fields.length === 1) return { rows: [], unavailable: fields };

    const groups = splitInto(fields, Math.min(SPLIT_FACTOR, fields.length));
    const results = await Promise.all(groups.map((g) => fetchMetricsBisecting(g, runOne, dimensionField, callBudget)));

    const merged = new Map<string, Record<string, string | number>>();
    const unavailable: string[] = [];
    for (const result of results) {
      for (const row of result.rows) {
        const key = String(row[dimensionField]);
        merged.set(key, { ...merged.get(key), ...row });
      }
      unavailable.push(...result.unavailable);
    }
    return { rows: Array.from(merged.values()), unavailable };
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
  const { t, i18n } = useTranslation();
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
  const [chartShape, setChartShape] = useState<ChartShape>("area");
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

  // Default to whichever data view is literally called "Account" when the
  // integration has one (the most broadly useful view for a first look) —
  // otherwise the first one offered — instead of making every visit start
  // with an empty required field.
  useEffect(() => {
    if (dataView || !dataViews || dataViews.length === 0) return;
    const accountView = dataViews.find((dv) => /^account$/i.test(dv.name) || /^account$/i.test(dv.id));
    setDataView((accountView ?? dataViews[0]).id);
  }, [dataView, dataViews]);

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

  // The account's real currency (as reported by the integration itself, not
  // assumed) — cost/spend/value metrics render in this currency everywhere
  // on the page instead of as bare numbers.
  const selectedCurrency = connections
    ?.flatMap((c) => c.accounts)
    .find((a) => a.account_id === accountId)?.currency;
  const formatMetricValue = (fieldName: string, value: number) =>
    isCurrencyMetric(fieldName) ? (
      <CurrencyAmount value={value} currencyCode={selectedCurrency} locale={i18n.language} />
    ) : (
      value.toLocaleString(i18n.language, { maximumFractionDigits: 2 })
    );

  // Auto-select an account once the list has loaded: the one remembered
  // from last time this integration was opened (scoped per tenant), or —
  // so there's always something selected rather than an empty required
  // field — simply the first account on offer.
  useEffect(() => {
    if (accountId || accountOptions.length === 0) return;
    const saved = getDefaultAccount(accountScope, integrationId);
    const fallback = saved && accountOptions.some((o) => o.value === saved) ? saved : accountOptions[0].value;
    selectAccount(fallback);
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

  // A flat `limit: 100` used to silently cap this at ~100 rows regardless of
  // range — a "This year" selection (~365 daily rows) lost every day past
  // the first 100, understating every total on the page while looking like
  // the page had just stopped updating. Size the limit to the actual range.
  const rowLimit = useMemo(() => Math.min(1000, Math.max(100, estimateDateRangeDays(dateRange) + 5)), [dateRange]);

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
          limit: rowLimit,
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
  const isFirstLoad = queryLoading && !hasData; // show skeletons only before any real data has ever arrived

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
  const heroMetricIds = useMemo(() => heroMetrics.map((f) => f.field_id), [heroMetrics]);

  // Per-campaign breakdown table — the same "important" metrics shown in the
  // hero cards above, broken out by campaign instead of summed account-wide,
  // with search/sort/pagination (matching the campaign table most ad
  // platforms' own reporting tools show). Not every integration has a
  // campaign concept, so this quietly disappears when none is found.
  const campaignDimension = useMemo(() => pickCampaignDimension(fieldsData?.fields ?? []), [fieldsData]);

  const { data: campaignResult, isFetching: campaignLoading } = useQuery({
    queryKey: [
      "rn-query-campaigns",
      integrationId,
      connectionKey,
      accountId,
      dataView,
      campaignDimension?.field_id,
      heroMetricIds.join(","),
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
          fields: [campaignDimension!.field_id, ...fields],
          date_range: dateRange as unknown as Record<string, unknown>,
          limit: 1000,
        });
      return fetchMetricsBisecting(heroMetricIds, runOne, campaignDimension!.field_id, {
        remaining: MAX_QUERY_CALLS,
      });
    },
    enabled:
      dataViewReady &&
      dateRangeReady &&
      !!connectionKey &&
      !!accountId &&
      !!campaignDimension &&
      heroMetricIds.length > 0,
  });

  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignSort, setCampaignSort] = useState<{ field: string; dir: "asc" | "desc" } | null>(null);
  const [campaignPage, setCampaignPage] = useState(0);
  const CAMPAIGN_PAGE_SIZE = 20;

  const effectiveCampaignSort = campaignSort ?? { field: heroMetricIds[0] ?? "", dir: "desc" as const };

  const filteredCampaignRows = useMemo(() => {
    if (!campaignDimension) return [];
    const rows = campaignResult?.rows ?? [];
    const term = campaignSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => String(r[campaignDimension.field_id] ?? "").toLowerCase().includes(term));
  }, [campaignResult, campaignDimension, campaignSearch]);

  const sortedCampaignRows = useMemo(() => {
    const { field, dir } = effectiveCampaignSort;
    if (!field) return filteredCampaignRows;
    const sign = dir === "asc" ? 1 : -1;
    return filteredCampaignRows.slice().sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (typeof av === "number" || typeof bv === "number") {
        return ((Number(av) || 0) - (Number(bv) || 0)) * sign;
      }
      return String(av ?? "").localeCompare(String(bv ?? "")) * sign;
    });
  }, [filteredCampaignRows, effectiveCampaignSort]);

  const campaignPageCount = Math.max(1, Math.ceil(sortedCampaignRows.length / CAMPAIGN_PAGE_SIZE));
  const clampedCampaignPage = Math.min(campaignPage, campaignPageCount - 1);
  const pagedCampaignRows = sortedCampaignRows.slice(
    clampedCampaignPage * CAMPAIGN_PAGE_SIZE,
    (clampedCampaignPage + 1) * CAMPAIGN_PAGE_SIZE
  );

  const toggleCampaignSort = (field: string) => {
    setCampaignSort((prev) => (prev?.field === field ? { field, dir: prev.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" }));
    setCampaignPage(0);
  };

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
        items: group.members.map((f) => ({
          label: f.field_name,
          value: totalFor(f.field_id),
          displayValue: formatMetricValue(f.field_name, totalFor(f.field_id)),
        })),
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

        <div className="flex flex-wrap items-end gap-3">
          {needsDataView && (
            <SearchableSelect
              label={t("integrations.dataView")}
              placeholder={t("common.select")}
              value={dataView}
              onChange={setDataView}
              options={dataViewOptions}
              className="w-44"
            />
          )}
          <SearchableSelect
            label={t("integrations.account")}
            placeholder={connectionsLoading ? t("common.loading") : t("common.select")}
            value={accountId ? `${connectionKey}::${accountId}` : ""}
            onChange={(v) => selectAccount(v)}
            options={accountOptions}
            className="w-56"
          />
          <DateRangePicker label={t("integrations.dateRange")} value={dateRange} onChange={setDateRange} />
          <SearchableSelect
            label={t("integrations.chartMetric")}
            value={effectiveChartMetric}
            onChange={setChartMetric}
            options={chartOptions}
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

      {queryError && (
        <p className="text-sm text-red-500">{extractApiErrorMessage(queryError) ?? t("integrations.loadError")}</p>
      )}

      {/* The whole layout renders as soon as we know the field catalog (no
          account needed for that) — values just sit at 0 until an account is
          chosen, then update in place once the query resolves. */}
      {metricFields.length > 0 && (
        <>
          {!accountId && (
            <p className="text-xs text-slate-400">{t("integrations.chooseAccountHint")}</p>
          )}
          {queryLoading && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400">{t("integrations.updatingData")}</p>
              <LoadingBar />
            </div>
          )}
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
                    value={formatMetricValue(field.field_name, totalsById.get(field.field_id) ?? 0)}
                    icon={Icon}
                    tone={tone}
                    variant={i === 0 ? "solid" : "light"}
                    footer={series.some((v) => v !== 0) ? <Sparkline data={series} /> : undefined}
                    loading={isFirstLoad}
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
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                {(
                  [
                    { shape: "area", Icon: AreaChartIcon },
                    { shape: "bar", Icon: BarChart3 },
                    { shape: "line", Icon: LineChartIcon },
                  ] as const
                ).map(({ shape, Icon }) => (
                  <button
                    key={shape}
                    onClick={() => setChartShape(shape)}
                    aria-label={t(`integrations.chartShape.${shape}`)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                      chartShape === shape
                        ? "bg-brand-600 text-white"
                        : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
            <RevenueChart
              data={primaryChartData}
              shape={chartShape}
              valueFormatter={
                isCurrencyMetric(chartMetricField?.field_name ?? effectiveChartMetric)
                  ? (v) => <CurrencyAmount value={v} currencyCode={selectedCurrency} locale={i18n.language} />
                  : undefined
              }
            />
            <p className="mt-2 text-xs text-slate-400">{t("integrations.dateRangeAppliesToAll")}</p>
          </div>

          {breakdownCards.length > 0 && (
            <div className={`grid grid-cols-1 gap-4 ${breakdownCards.length > 1 ? "lg:grid-cols-2" : ""}`}>
              {breakdownCards.map((card, i) => (
                <div
                  key={card.key}
                  className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${
                    // An odd one out left alone on the last row spans full width
                    // instead of leaving a dead empty cell beside it.
                    breakdownCards.length % 2 === 1 && i === breakdownCards.length - 1 ? "lg:col-span-2" : ""
                  }`}
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

          {campaignDimension && (
            <Card className="!p-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t("integrations.campaigns")}</h2>
                  {sortedCampaignRows.length > 0 && (
                    <p className="text-xs text-slate-400">
                      {t("integrations.paginationRange", {
                        from: clampedCampaignPage * CAMPAIGN_PAGE_SIZE + 1,
                        to: Math.min(sortedCampaignRows.length, (clampedCampaignPage + 1) * CAMPAIGN_PAGE_SIZE),
                        total: sortedCampaignRows.length,
                      })}
                    </p>
                  )}
                </div>
                <div className="relative w-full max-w-xs sm:w-64">
                  <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={campaignSearch}
                    onChange={(e) => {
                      setCampaignSearch(e.target.value);
                      setCampaignPage(0);
                    }}
                    placeholder={t("integrations.searchCampaigns")}
                    className="w-full rounded-lg border border-slate-300 bg-transparent py-1.5 ps-8 pe-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
                  />
                </div>
              </div>

              {campaignLoading && sortedCampaignRows.length === 0 ? (
                <div className="p-4">
                  <LoadingBar />
                </div>
              ) : sortedCampaignRows.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">{t("integrations.noCampaigns")}</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                          <th className="px-4 py-3 text-start font-medium">
                            <button
                              onClick={() => toggleCampaignSort(campaignDimension.field_id)}
                              className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                              {t("integrations.campaignName")}
                              {effectiveCampaignSort.field === campaignDimension.field_id &&
                                (effectiveCampaignSort.dir === "asc" ? "▲" : "▼")}
                            </button>
                          </th>
                          {heroMetrics.map((field) => (
                            <th key={field.field_id} className="px-4 py-3 text-start font-medium">
                              <button
                                onClick={() => toggleCampaignSort(field.field_id)}
                                className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                {field.field_name}
                                {effectiveCampaignSort.field === field.field_id &&
                                  (effectiveCampaignSort.dir === "asc" ? "▲" : "▼")}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pagedCampaignRows.map((row, i) => (
                          <tr key={`${row[campaignDimension.field_id]}-${i}`}>
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {String(row[campaignDimension.field_id] ?? "—")}
                            </td>
                            {heroMetrics.map((field) => (
                              <td key={field.field_id} className="px-4 py-3">
                                {formatMetricValue(field.field_name, Number(row[field.field_id]) || 0)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {campaignPageCount > 1 && (
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
                      <button
                        onClick={() => setCampaignPage((p) => Math.max(0, p - 1))}
                        disabled={clampedCampaignPage === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => setCampaignPage((p) => Math.min(campaignPageCount - 1, p + 1))}
                        disabled={clampedCampaignPage >= campaignPageCount - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </Card>
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
              const hasData = series.some((v) => v !== 0);
              const { icon: Icon, tone } = getMetricVisual(field.field_name);
              const rate = isRateMetric(field.field_name);
              const color = TONE_HEX[tone];

              // A rate (CTR and friends) should be averaged across the
              // period, not summed — and reads better as a progress donut
              // than a trend line. Everything else rotates through
              // line/bar/area so the grid isn't a wall of identical shapes.
              const average = series.length ? series.reduce((a, b) => a + b, 0) / series.length : 0;
              const value = rate ? average : totalsById.get(field.field_id) ?? 0;

              let footer;
              if (!hasData) {
                footer = undefined;
              } else if (rate) {
                footer = <MiniProgressDonut value={average} color={color} />;
              } else if (i % 3 === 0) {
                footer = <Sparkline data={series} color={color} />;
              } else if (i % 3 === 1) {
                footer = <MiniBarChart data={series} color={color} />;
              } else {
                footer = <MiniAreaChart data={series} color={color} />;
              }

              return (
                <GlowCard
                  key={field.field_id}
                  label={field.field_name}
                  value={formatMetricValue(field.field_name, value)}
                  icon={<Icon size={16} />}
                  accent={tone ?? GRID_ACCENTS[i % GRID_ACCENTS.length]}
                  footer={footer}
                  loading={isFirstLoad}
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
