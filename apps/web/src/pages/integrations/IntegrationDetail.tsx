import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlowCard } from "@/components/ui/GlowCard";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { getIntegrationDetail, listConnections, listFields, runQuery } from "@/lib/reportingNinja";
import { getIntegrationVisual } from "@/lib/integrationIcons";

const ACCENTS = ["brand", "violet", "teal", "amber"] as const;

export default function IntegrationDetail() {
  const { integrationId = "" } = useParams<{ integrationId: string }>();
  const { t } = useTranslation();
  const visual = getIntegrationVisual(integrationId);

  const [connectionKey, setConnectionKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dataView, setDataView] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

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

  const activeMetrics =
    selectedMetrics.length > 0 ? selectedMetrics : metricFields.slice(0, 4).map((f) => f.field_id);

  const metricOptions: SearchableOption[] = metricFields
    .filter((f) => !activeMetrics.includes(f.field_id))
    .map((f) => ({ value: f.field_id, label: f.field_name, description: f.field_description || undefined }));

  const {
    data: rows,
    isFetching: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["rn-query", integrationId, connectionKey, accountId, dataView, activeMetrics.join(",")],
    queryFn: () =>
      runQuery<Record<string, string | number>>({
        integration_id: integrationId,
        connection_key: connectionKey,
        account_id: accountId,
        ...(dataView ? { data_view: dataView } : {}),
        ...(defaultSettings ? { settings: defaultSettings } : {}),
        fields: [dimensionField, ...activeMetrics],
        date_range: { preset: "lastxdays", x: 30 },
        limit: 100,
      }),
    enabled: dataViewReady && !!connectionKey && !!accountId && activeMetrics.length > 0,
  });

  const totals = activeMetrics.reduce<Record<string, number>>((acc, metric) => {
    acc[metric] = (rows ?? []).reduce((sum, row) => sum + (Number(row[metric]) || 0), 0);
    return acc;
  }, {});

  const chartData = (rows ?? [])
    .slice()
    .sort((a, b) => String(a[dimensionField]).localeCompare(String(b[dimensionField])))
    .map((row) => ({ label: String(row[dimensionField]), value: Number(row[activeMetrics[0]]) || 0 }));

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
        <div className={`grid grid-cols-1 gap-4 ${needsDataView ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {needsDataView && (
            <SearchableSelect
              label={t("integrations.dataView")}
              placeholder={t("common.select")}
              value={dataView}
              onChange={(v) => {
                setDataView(v);
                setSelectedMetrics([]);
              }}
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

          <SearchableSelect
            label={t("integrations.addMetric")}
            placeholder={t("integrations.addMetric")}
            value=""
            onChange={(metric) => setSelectedMetrics((prev) => [...prev, metric])}
            options={metricOptions}
            disabled={!dataViewReady}
          />
        </div>

        {activeMetrics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeMetrics.map((metric) => {
              const field = metricFields.find((f) => f.field_id === metric);
              return (
                <span
                  key={metric}
                  className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                >
                  {field?.field_name ?? metric}
                  <button
                    onClick={() => setSelectedMetrics(activeMetrics.filter((m) => m !== metric))}
                    className="text-brand-500 hover:text-brand-800 dark:hover:text-brand-100"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeMetrics.map((metric, i) => {
              const field = metricFields.find((f) => f.field_id === metric);
              return (
                <GlowCard
                  key={metric}
                  label={field?.field_name ?? metric}
                  value={totals[metric]?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  accent={ACCENTS[i % ACCENTS.length]}
                />
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {metricFields.find((f) => f.field_id === activeMetrics[0])?.field_name ?? activeMetrics[0]} ·{" "}
              {t("integrations.last30Days")}
            </h2>
            <RevenueChart data={chartData} />
          </div>
        </>
      )}
    </div>
  );
}
