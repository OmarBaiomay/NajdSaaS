import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlowCard } from "@/components/ui/GlowCard";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { MetricDonutChart } from "@/components/charts/MetricDonutChart";
import { getIntegrationDetail, listConnections, listFields, runQuery } from "@/lib/reportingNinja";
import { getIntegrationVisual } from "@/lib/integrationIcons";
import { groupMetricsByPercentTier } from "@/lib/metricGrouping";

const ACCENTS = ["brand", "violet", "teal", "amber"] as const;

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

export default function IntegrationDetail() {
  const { integrationId = "" } = useParams<{ integrationId: string }>();
  const { t } = useTranslation();
  const visual = getIntegrationVisual(integrationId);

  const [connectionKey, setConnectionKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dataView, setDataView] = useState("");
  const [metricSearch, setMetricSearch] = useState("");

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

  const { data: fieldsData } = useQuery({
    queryKey: ["rn-fields", integrationId, dataView],
    queryFn: () => listFields(integrationId, dataView || undefined),
    enabled: dataViewReady,
  });

  const metricFields = useMemo(() => fieldsData?.fields.filter((f) => f.dim_met === "metric") ?? [], [fieldsData]);
  const dimensionField = fieldsData?.default_dimension ?? "day";
  const metricIds = useMemo(() => metricFields.map((f) => f.field_id), [metricFields]);

  const {
    data: queryResult,
    isFetching: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["rn-query-all", integrationId, connectionKey, accountId, dataView, metricIds.join(",")],
    queryFn: async () => {
      const runOne = (fields: string[]) =>
        runQuery<Record<string, string | number>>({
          integration_id: integrationId,
          connection_key: connectionKey,
          account_id: accountId,
          ...(dataView ? { data_view: dataView } : {}),
          ...(defaultSettings ? { settings: defaultSettings } : {}),
          fields: [dimensionField, ...fields],
          date_range: { preset: "lastxdays", x: 30 },
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
    enabled: dataViewReady && !!connectionKey && !!accountId && metricIds.length > 0,
  });

  const rows = queryResult?.rows;

  const sortedRows = useMemo(
    () => (rows ?? []).slice().sort((a, b) => String(a[dimensionField]).localeCompare(String(b[dimensionField]))),
    [rows, dimensionField]
  );

  const availableMetrics = useMemo(
    () => metricFields.filter((f) => !queryResult?.unavailable.includes(f.field_id)),
    [metricFields, queryResult]
  );

  // Metric families like "Video Plays at 25/50/75/100%" tell a much clearer
  // story as a donut than as four disconnected number cards — pull those out.
  const { groups: donutGroups, ungrouped } = useMemo(
    () => groupMetricsByPercentTier(availableMetrics),
    [availableMetrics]
  );

  const totalFor = (fieldId: string) => sortedRows.reduce((sum, row) => sum + (Number(row[fieldId]) || 0), 0);

  const visibleMetrics = useMemo(
    () => ungrouped.filter((f) => f.field_name.toLowerCase().includes(metricSearch.trim().toLowerCase())),
    [ungrouped, metricSearch]
  );

  const primaryMetric = fieldsData?.default_metric ?? visibleMetrics[0]?.field_id ?? donutGroups[0]?.tiers[0]?.field.field_id;
  const primaryChartData = sortedRows.map((row) => ({
    label: String(row[dimensionField]),
    value: Number(row[primaryMetric ?? ""]) || 0,
  }));

  return (
    <div className="space-y-6">
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

      <Card>
        <div className={`grid grid-cols-1 gap-4 ${needsDataView ? "sm:grid-cols-2" : "sm:grid-cols-1 sm:max-w-sm"}`}>
          {needsDataView && (
            <SearchableSelect
              label={t("integrations.dataView")}
              placeholder={t("common.select")}
              value={dataView}
              onChange={setDataView}
              options={dataViewOptions}
            />
          )}

          <SearchableSelect
            label={t("integrations.account")}
            placeholder={connectionsLoading ? t("common.loading") : t("common.select")}
            value={accountId ? `${connectionKey}::${accountId}` : ""}
            onChange={(v) => {
              const [ck, aid] = v.split("::");
              setConnectionKey(ck ?? "");
              setAccountId(aid ?? "");
            }}
            options={accountOptions}
          />
        </div>
      </Card>

      {needsDataView && !dataView && (
        <Card className="text-center text-sm text-slate-500">{t("integrations.selectDataView")}</Card>
      )}

      {!accountId && !connectionsLoading && (connections?.length ?? 0) === 0 && (
        <Card className="text-center text-sm text-slate-500">{t("integrations.noAccounts")}</Card>
      )}

      {queryError && <p className="text-sm text-red-500">{t("integrations.loadError")}</p>}
      {queryLoading && <p className="text-sm text-slate-400">{t("common.loading")}</p>}

      {rows && (
        <>
          {(queryResult?.unavailable.length ?? 0) > 0 && (
            <p className="text-xs text-slate-400">
              {t("integrations.someMetricsUnavailable", { count: queryResult!.unavailable.length })}
            </p>
          )}

          {primaryMetric && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {metricFields.find((f) => f.field_id === primaryMetric)?.field_name ?? primaryMetric} ·{" "}
                {t("integrations.last30Days")}
              </h2>
              <RevenueChart data={primaryChartData} />
            </div>
          )}

          {donutGroups.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {donutGroups.map((group) => {
                const baseTotal = group.baseField ? totalFor(group.baseField.field_id) : undefined;
                return (
                  <div
                    key={group.key}
                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <h2 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {t("integrations.breakdownOf", { name: group.baseLabel })}
                    </h2>
                    {baseTotal !== undefined && (
                      <p className="mb-2 text-xs text-slate-400">
                        {t("integrations.ofTotal", { total: baseTotal.toLocaleString() })}
                      </p>
                    )}
                    <MetricDonutChart
                      slices={group.tiers.map((tier) => ({
                        label: `${tier.percent}%`,
                        value: totalFor(tier.field.field_id),
                      }))}
                      centerValue={baseTotal?.toLocaleString()}
                      centerLabel={group.baseLabel}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative max-w-sm">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={metricSearch}
              onChange={(e) => setMetricSearch(e.target.value)}
              placeholder={t("integrations.searchMetrics")}
              className="w-full rounded-lg border border-slate-300 bg-transparent py-2 ps-9 pe-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleMetrics.map((field, i) => {
              const series = sortedRows.map((row) => Number(row[field.field_id]) || 0);
              const total = series.reduce((sum, v) => sum + v, 0);
              return (
                <GlowCard
                  key={field.field_id}
                  label={field.field_name}
                  value={total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  accent={ACCENTS[i % ACCENTS.length]}
                  footer={series.some((v) => v !== 0) ? <Sparkline data={series} /> : undefined}
                />
              );
            })}
          </div>

          {visibleMetrics.length === 0 && (
            <Card className="text-center text-sm text-slate-500">{t("common.noResults")}</Card>
          )}
        </>
      )}
    </div>
  );
}
