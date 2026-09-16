import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { HeroMetricCard } from "@/components/ui/HeroMetricCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateRangePicker, DEFAULT_DATE_RANGE, type DateRangeValue } from "@/components/ui/DateRangePicker";
import { CurrencyAmount } from "@/components/ui/SarSymbol";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { BreakdownTable } from "@/components/integrations/BreakdownTable";
import { useAccountSelector } from "@/hooks/useAccountSelector";
import { runQuery } from "@/lib/reportingNinja";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { getIntegrationVisual } from "@/lib/integrationIcons";
import { getMetricVisual } from "@/lib/metricVisuals";
import { extractApiErrorMessage } from "@/lib/reportingNinjaErrors";

const INTEGRATION_ID = "google_ads";

// Field ids verified live against the real account (values matched the
// reference report within normal live-data drift): "customer" is Google
// Ads' account-level rollup data view — querying it with no dimension
// gives one true aggregate row for the whole range (unlike "campaign",
// which is inherently per-campaign-grain data and still segments even
// without an explicit dimension field).
const COST = "metrics.cost_micros";
const CONVERSIONS = "metrics.conversions";
const COST_PER_CONV = "metrics.cost_per_conversion";
const CONV_VALUE = "metrics.conversions_value";
const DAY = "segments.date";
const CAMPAIGN_NAME = "campaign.name";
const KEYWORD_TEXT = "ad_group_criterion.keyword.text";
const SEARCH_TERM = "search_term_view.search_term";

/** Google Ads doesn't expose ROAS as its own field — the reference report's
 * "4.61" is Total conv. value ÷ Cost (verified: 141642.20 / 30822.95 =
 * 4.595, matching the screenshot's 4.61 within normal live-data drift).
 * Computed the same way everywhere it's shown: hero card, campaign table,
 * keyword/search-term tables, trend chart. */
function roasOf(row: Record<string, string | number>): number {
  const cost = Number(row[COST]) || 0;
  const value = Number(row[CONV_VALUE]) || 0;
  return cost > 0 ? value / cost : 0;
}

function withRoas(rows: Record<string, string | number>[]): Record<string, string | number>[] {
  return rows.map((r) => ({ ...r, roas: roasOf(r) }));
}

/**
 * Hand-built Google Ads page, mirroring the tenant's existing Looker Studio
 * report. See pages/integrations/custom/registry.tsx.
 */
export default function GoogleAdsDetail() {
  const { t, i18n } = useTranslation();
  const visual = getIntegrationVisual(INTEGRATION_ID);

  const { connectionKey, accountId, accountOptions, connectionsLoading, selectAccount, selectedCurrency } =
    useAccountSelector(INTEGRATION_ID);

  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const dateRangeReady = dateRange.preset !== "custom" || (!!dateRange.start && !!dateRange.end);
  const queryEnabled = dateRangeReady && !!connectionKey && !!accountId;
  const rangeKey = JSON.stringify(dateRange);

  const currency = (v: number) => <CurrencyAmount value={v} currencyCode={selectedCurrency} locale={i18n.language} />;
  const plainNumber = (v: number) => v.toLocaleString(i18n.language, { maximumFractionDigits: 2 });

  const { data: heroRow, isFetching: heroLoading, error: heroError } = useQuery({
    queryKey: ["gads-hero", connectionKey, accountId, rangeKey],
    queryFn: async () => {
      const rows = await runQuery<Record<string, number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        data_view: "customer",
        fields: [COST, CONVERSIONS, COST_PER_CONV, CONV_VALUE],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1,
      });
      return rows[0] ?? {};
    },
    enabled: queryEnabled,
  });
  const heroRoas = heroRow ? roasOf(heroRow) : 0;

  const { data: campaignRows, isFetching: campaignLoading, error: campaignError } = useQuery({
    queryKey: ["gads-campaigns", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        data_view: "campaign",
        fields: [CAMPAIGN_NAME, COST, CONVERSIONS, COST_PER_CONV, CONV_VALUE],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });
  const campaignRowsWithRoas = useMemo(() => withRoas(campaignRows ?? []), [campaignRows]);

  const { data: keywordRows, isFetching: keywordLoading, error: keywordError } = useQuery({
    queryKey: ["gads-keywords", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        data_view: "keyword_view",
        fields: [KEYWORD_TEXT, COST, CONV_VALUE],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });
  const keywordRowsWithRoas = useMemo(() => withRoas(keywordRows ?? []), [keywordRows]);

  // The search-term report is genuinely huge (4,659 rows on the reference
  // account, confirmed live) — one call caps at 1000 rows, so this pages
  // through the rest via cursor instead of silently truncating.
  const { data: searchTermRows, isFetching: searchTermLoading, error: searchTermError } = useQuery({
    queryKey: ["gads-search-terms", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        data_view: "search_term_view",
        fields: [SEARCH_TERM, COST, CONV_VALUE],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });
  const searchTermRowsWithRoas = useMemo(() => withRoas(searchTermRows ?? []), [searchTermRows]);

  // Trend charts share the page's one date-range control (like every other
  // page in the app) rather than the reference report's own separately-set
  // long historical range — say if you'd rather they stayed independent.
  const { data: trendRows, isFetching: trendLoading, error: trendError } = useQuery({
    queryKey: ["gads-trend", connectionKey, accountId, rangeKey],
    queryFn: () =>
      runQuery<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        data_view: "customer",
        fields: [DAY, COST, CONVERSIONS, CONV_VALUE],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 400,
      }),
    enabled: queryEnabled,
  });
  const sortedTrendRows = useMemo(
    () => (trendRows ?? []).slice().sort((a, b) => String(a[DAY]).localeCompare(String(b[DAY]))),
    [trendRows]
  );
  const costTrend = sortedTrendRows.map((r) => ({ label: String(r[DAY]), value: Number(r[COST]) || 0 }));
  const conversionsTrend = sortedTrendRows.map((r) => ({ label: String(r[DAY]), value: Number(r[CONVERSIONS]) || 0 }));
  const roasTrend = sortedTrendRows.map((r) => ({ label: String(r[DAY]), value: roasOf(r) }));

  // Sparkline series for the hero cards — same source as the trend charts
  // below, just the bare numbers.
  const costSeries = sortedTrendRows.map((r) => Number(r[COST]) || 0);
  const conversionsSeries = sortedTrendRows.map((r) => Number(r[CONVERSIONS]) || 0);
  const convValueSeries = sortedTrendRows.map((r) => Number(r[CONV_VALUE]) || 0);
  const costPerConvSeries = sortedTrendRows.map((r) => {
    const conv = Number(r[CONVERSIONS]) || 0;
    return conv > 0 ? (Number(r[COST]) || 0) / conv : 0;
  });
  const roasSeries = roasTrend.map((p) => p.value);

  const anyError = heroError ?? campaignError ?? keywordError ?? searchTermError ?? trendError;
  const errorMessage = anyError ? extractApiErrorMessage(anyError) ?? t("integrations.loadError") : undefined;

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
          <h1 className="text-lg font-semibold">Google Ads</h1>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <SearchableSelect
            label={t("integrations.account")}
            placeholder={connectionsLoading ? t("common.loading") : t("common.select")}
            value={accountId ? `${connectionKey}::${accountId}` : ""}
            onChange={(v) => selectAccount(v)}
            options={accountOptions}
            className="w-56"
          />
          <DateRangePicker label={t("integrations.dateRange")} value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {!accountId && !connectionsLoading && accountOptions.length === 0 && (
        <Card className="text-center text-sm text-slate-500">{t("integrations.noAccounts")}</Card>
      )}

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      {accountId && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <HeroMetricCard
              label={t("googleAds.cost")}
              value={currency(heroRow?.[COST] ?? 0)}
              icon={getMetricVisual("spend").icon}
              tone={getMetricVisual("spend").tone}
              variant="solid"
              footer={costSeries.some((v) => v !== 0) ? <Sparkline data={costSeries} /> : undefined}
              loading={heroLoading}
            />
            <HeroMetricCard
              label={t("googleAds.purchase")}
              value={plainNumber(heroRow?.[CONVERSIONS] ?? 0)}
              icon={getMetricVisual("purchase").icon}
              tone={getMetricVisual("purchase").tone}
              footer={conversionsSeries.some((v) => v !== 0) ? <Sparkline data={conversionsSeries} /> : undefined}
              loading={heroLoading}
            />
            <HeroMetricCard
              label={t("googleAds.costPerConv")}
              value={currency(heroRow?.[COST_PER_CONV] ?? 0)}
              icon={getMetricVisual("cost per").icon}
              tone={getMetricVisual("cost per").tone}
              footer={costPerConvSeries.some((v) => v !== 0) ? <Sparkline data={costPerConvSeries} /> : undefined}
              loading={heroLoading}
            />
            <HeroMetricCard
              label={t("googleAds.totalConvValue")}
              value={currency(heroRow?.[CONV_VALUE] ?? 0)}
              icon={getMetricVisual("value").icon}
              tone={getMetricVisual("value").tone}
              footer={convValueSeries.some((v) => v !== 0) ? <Sparkline data={convValueSeries} /> : undefined}
              loading={heroLoading}
            />
            <HeroMetricCard
              label={t("googleAds.roas")}
              value={plainNumber(heroRoas)}
              icon={getMetricVisual("roas").icon}
              tone={getMetricVisual("roas").tone}
              footer={roasSeries.some((v) => v !== 0) ? <Sparkline data={roasSeries} /> : undefined}
              loading={heroLoading}
            />
          </div>

          <BreakdownTable
            title={t("googleAds.campaignTable")}
            dimensionLabel={t("googleAds.campaign")}
            dimensionField={CAMPAIGN_NAME}
            columns={[
              { id: COST, label: t("googleAds.cost"), render: (v) => currency(Number(v)) },
              { id: CONVERSIONS, label: t("googleAds.conversions") },
              { id: COST_PER_CONV, label: t("googleAds.costPerConv"), render: (v) => currency(Number(v)) },
              { id: CONV_VALUE, label: t("googleAds.totalConvValue"), render: (v) => currency(Number(v)) },
              { id: "roas", label: t("googleAds.roas"), render: (v) => plainNumber(Number(v)) },
            ]}
            rows={campaignRowsWithRoas}
            loading={campaignLoading}
            emptyLabel={t("googleAds.noCampaigns")}
            searchPlaceholder={t("integrations.searchCampaigns")}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BreakdownTable
              title={t("googleAds.searchKeywordTable")}
              dimensionLabel={t("googleAds.searchKeyword")}
              dimensionField={KEYWORD_TEXT}
              columns={[{ id: "roas", label: t("googleAds.roas"), render: (v) => plainNumber(Number(v)) }]}
              rows={keywordRowsWithRoas}
              loading={keywordLoading}
              emptyLabel={t("googleAds.noKeywords")}
              searchPlaceholder={t("googleAds.searchKeywordPlaceholder")}
            />
            <BreakdownTable
              title={t("googleAds.searchTermTable")}
              dimensionLabel={t("googleAds.searchTerm")}
              dimensionField={SEARCH_TERM}
              columns={[{ id: "roas", label: t("googleAds.roas"), render: (v) => plainNumber(Number(v)) }]}
              rows={searchTermRowsWithRoas}
              loading={searchTermLoading}
              emptyLabel={t("googleAds.noSearchTerms")}
              searchPlaceholder={t("googleAds.searchTermPlaceholder")}
            />
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("googleAds.costOverTime")}</h2>
            <RevenueChart data={costTrend} shape="area" valueFormatter={(v) => currency(v)} />
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {t("googleAds.conversionsOverTime")}
            </h2>
            <RevenueChart data={conversionsTrend} shape="area" />
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("googleAds.roasOverTime")}</h2>
            <RevenueChart data={roasTrend} shape="area" />
          </Card>
        </>
      )}
    </div>
  );
}
