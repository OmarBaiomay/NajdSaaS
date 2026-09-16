import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateRangePicker, DEFAULT_DATE_RANGE, type DateRangeValue } from "@/components/ui/DateRangePicker";
import { CurrencyAmount } from "@/components/ui/SarSymbol";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { BreakdownTable } from "@/components/integrations/BreakdownTable";
import { SwappableHeroRow, type HeroCandidate } from "@/components/integrations/SwappableHeroRow";
import { clsx } from "@/lib/clsx";
import { useAccountSelector } from "@/hooks/useAccountSelector";
import { runQuery } from "@/lib/reportingNinja";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { getIntegrationVisual } from "@/lib/integrationIcons";
import { extractApiErrorMessage } from "@/lib/reportingNinjaErrors";

const INTEGRATION_ID = "snapchat_ads";

// Field ids verified live against the real account (values matched the
// reference report exactly for impressions/spend/purchases). Every account
// requires these settings (recommended values applied automatically, same
// as the generic integration page does).
const SETTINGS = { click_window: "28_DAY", view_window: "1_DAY", conversion_report_time: "TIME_OF_IMPRESSION" };

const DAY = "day";
const IMPRESSIONS = "paid_impressions";
const SPEND = "spend";
const PURCHASES = "conversion_purchases";
const PURCHASE_VALUE = "conversion_purchases_value";
const ROAS = "purchase_roas";
const TOTAL_IMPRESSIONS = "total_impressions";
const SWIPE_UPS = "conversion_purchases_swipe_up";
const CAMPAIGN_NAME = "campaign_name";
const AD_NAME = "ad_name";
const AD_STATUS = "ad_status";

// The 4 defaults (matching the reference report) plus a couple of
// well-known alternates for the ⋮ swap menu, all fetched in the same
// day-level query as the defaults.
const HERO_FIELDS = [IMPRESSIONS, SPEND, PURCHASES, PURCHASE_VALUE, ROAS, TOTAL_IMPRESSIONS, SWIPE_UPS];
const DEFAULT_HERO_KEYS = ["impressions", "spend", "purchases", "roas"];

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Paused: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

/**
 * Hand-built Snapchat Ads page, mirroring the tenant's existing Looker
 * Studio report. See pages/integrations/custom/registry.tsx.
 *
 * Unlike Google Ads, Snapchat's own `purchase_roas` field is accurate and
 * usable directly — confirmed live: querying the "campaign" data view with
 * campaign_name as the dimension returns each campaign's native ROAS
 * matching the reference table exactly (no client-side recomputation
 * needed there). The one place it does need recomputing is the hero card:
 * "account" data view has no true account-wide rollup (its default
 * dimension is "day"), so getting one total means summing every day's
 * spend/purchases/impressions ourselves — and averaging (or worse,
 * summing) the daily ROAS values directly would be wrong for the same
 * reason it was wrong on the generic page, so the hero ROAS is instead
 * Σ purchase value ÷ Σ spend across the whole range.
 */
export default function SnapchatAdsDetail() {
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

  const { data: dailyRows, isFetching: heroLoading, error: heroError } = useQuery({
    queryKey: ["snap-daily", connectionKey, accountId, rangeKey],
    queryFn: () =>
      runQuery<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        data_view: "account",
        settings: SETTINGS,
        fields: [DAY, ...HERO_FIELDS],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });
  const heroTotals = useMemo(() => {
    const rows = dailyRows ?? [];
    const impressions = rows.reduce((s, r) => s + (Number(r[IMPRESSIONS]) || 0), 0);
    const spend = rows.reduce((s, r) => s + (Number(r[SPEND]) || 0), 0);
    const purchases = rows.reduce((s, r) => s + (Number(r[PURCHASES]) || 0), 0);
    const value = rows.reduce((s, r) => s + (Number(r[PURCHASE_VALUE]) || 0), 0);
    return { impressions, spend, purchases, roas: spend > 0 ? value / spend : 0 };
  }, [dailyRows]);

  const sortedDailyRows = useMemo(
    () => (dailyRows ?? []).slice().sort((a, b) => String(a[DAY]).localeCompare(String(b[DAY]))),
    [dailyRows]
  );
  const roasTrend = sortedDailyRows.map((r) => ({ label: String(r[DAY]), value: Number(r[ROAS]) || 0 }));

  // Sparkline series for the hero cards.
  const impressionsSeries = sortedDailyRows.map((r) => Number(r[IMPRESSIONS]) || 0);
  const spendSeries = sortedDailyRows.map((r) => Number(r[SPEND]) || 0);
  const purchasesSeries = sortedDailyRows.map((r) => Number(r[PURCHASES]) || 0);
  const roasSeries = roasTrend.map((p) => p.value);
  const totalImpressionsSeries = sortedDailyRows.map((r) => Number(r[TOTAL_IMPRESSIONS]) || 0);
  const swipeUpsSeries = sortedDailyRows.map((r) => Number(r[SWIPE_UPS]) || 0);

  const heroCandidates: HeroCandidate[] = [
    {
      key: "impressions",
      label: t("snapchatAds.paidImpressions"),
      visualKeyword: "impression",
      format: plainNumber,
      value: heroTotals.impressions,
      series: impressionsSeries,
    },
    {
      key: "spend",
      label: t("snapchatAds.spend"),
      visualKeyword: "spend",
      format: currency,
      value: heroTotals.spend,
      series: spendSeries,
    },
    {
      key: "purchases",
      label: t("snapchatAds.purchases"),
      visualKeyword: "purchase",
      format: plainNumber,
      value: heroTotals.purchases,
      series: purchasesSeries,
    },
    {
      key: "roas",
      label: t("snapchatAds.purchaseRoas"),
      visualKeyword: "roas",
      format: plainNumber,
      value: heroTotals.roas,
      series: roasSeries,
    },
    {
      key: "totalImpressions",
      label: t("snapchatAds.totalImpressions"),
      visualKeyword: "impression",
      format: plainNumber,
      value: sortedDailyRows.reduce((s, r) => s + (Number(r[TOTAL_IMPRESSIONS]) || 0), 0),
      series: totalImpressionsSeries,
    },
    {
      key: "swipeUps",
      label: t("snapchatAds.swipeUps"),
      visualKeyword: "click",
      format: plainNumber,
      value: sortedDailyRows.reduce((s, r) => s + (Number(r[SWIPE_UPS]) || 0), 0),
      series: swipeUpsSeries,
    },
  ];

  const { data: campaignRows, isFetching: campaignLoading, error: campaignError } = useQuery({
    queryKey: ["snap-campaigns", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        data_view: "campaign",
        settings: SETTINGS,
        fields: [CAMPAIGN_NAME, SPEND, PURCHASES, ROAS],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });

  const { data: adRows, isFetching: adLoading, error: adError } = useQuery({
    queryKey: ["snap-ads", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        data_view: "ad",
        settings: SETTINGS,
        fields: [AD_NAME, AD_STATUS, SPEND, PURCHASES, ROAS],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });

  const anyError = heroError ?? campaignError ?? adError;
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
          <h1 className="text-lg font-semibold">Snapchat Ads</h1>
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
          <SwappableHeroRow
            defaultKeys={DEFAULT_HERO_KEYS}
            candidates={heroCandidates}
            loading={heroLoading}
            resetKey={accountId}
          />

          <BreakdownTable
            title={t("snapchatAds.campaignTable")}
            dimensionLabel={t("snapchatAds.campaign")}
            dimensionField={CAMPAIGN_NAME}
            defaultSortField={SPEND}
            columns={[
              { id: SPEND, label: t("snapchatAds.spend"), render: (v) => currency(Number(v)) },
              { id: PURCHASES, label: t("snapchatAds.purchases") },
              { id: ROAS, label: t("snapchatAds.purchaseRoas"), render: (v) => plainNumber(Number(v)) },
            ]}
            rows={campaignRows ?? []}
            loading={campaignLoading}
            emptyLabel={t("snapchatAds.noCampaigns")}
            searchPlaceholder={t("snapchatAds.searchCampaigns")}
          />

          <BreakdownTable
            title={t("snapchatAds.adTable")}
            dimensionLabel={t("snapchatAds.adName")}
            dimensionField={AD_NAME}
            defaultSortField={SPEND}
            columns={[
              {
                id: AD_STATUS,
                label: t("snapchatAds.adStatus"),
                type: "text",
                render: (v) => (
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_STYLES[String(v)] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {String(v)}
                  </span>
                ),
              },
              { id: SPEND, label: t("snapchatAds.spend"), render: (v) => currency(Number(v)) },
              { id: PURCHASES, label: t("snapchatAds.purchases") },
              { id: ROAS, label: t("snapchatAds.purchaseRoas"), render: (v) => plainNumber(Number(v)) },
            ]}
            rows={adRows ?? []}
            loading={adLoading}
            emptyLabel={t("snapchatAds.noAds")}
            searchPlaceholder={t("snapchatAds.searchAds")}
          />

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("snapchatAds.roasOverTime")}</h2>
            <RevenueChart data={roasTrend} shape="area" />
          </Card>
        </>
      )}
    </div>
  );
}
