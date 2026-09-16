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
import { useAccountSelector } from "@/hooks/useAccountSelector";
import { runQuery } from "@/lib/reportingNinja";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { getIntegrationVisual } from "@/lib/integrationIcons";
import { extractApiErrorMessage } from "@/lib/reportingNinjaErrors";

const INTEGRATION_ID = "facebook_ads";

// Attribution window setting Facebook requires on every query — same
// recommended value the generic integration page auto-applies from
// /integrations/detail.
const SETTINGS = { attribution_window: "ATTRIBUTION_MODEL_VIEW_CLICK###VIEW_ATTRIBUTION_WINDOW_1D###CLICK_ATTRIBUTION_WINDOW_7D" };

const DAY = "day";
const IMPRESSIONS = "impressions";
const SPEND = "spend";
const PURCHASES = "actions:omni_purchase";
const PURCHASE_VALUE = "action_values:omni_purchase";
const ROAS = "purchase_roas:omni_purchase";
const LINK_CLICKS = "actions:link_click";
const REACH = "reach";
const CTR = "ctr";
const CLICKS = "clicks";
const CAMPAIGN_NAME = "campaign_name";

// Every field the hero row can show, fetched together in one query — the
// 4 defaults (matching the reference report exactly) plus a handful of
// well-known alternates so the ⋮ swap menu has real options. Verified live
// against the real account: all 10 fields combine in a single call.
const HERO_FIELDS = [IMPRESSIONS, SPEND, PURCHASES, PURCHASE_VALUE, ROAS, LINK_CLICKS, REACH, CTR, CLICKS];

const DEFAULT_HERO_KEYS = ["impressions", "spend", "purchases", "roas"];

/**
 * Hand-built Meta (Facebook) Ads page, mirroring the tenant's existing
 * Looker Studio report. See pages/integrations/custom/registry.tsx.
 *
 * Field ids verified live against the real account (values matched the
 * reference exactly): impressions 817,535 ≈ 817,534, spend 15,797.68 =
 * 15,797.68, purchases 325 = 325, computed ROAS 6.205 ≈ 6.21. The campaign
 * table's 4 rows (dimension campaign_name) matched exactly too, including
 * each row's native purchase_roas — unlike the hero card's ROAS, which
 * still needs recomputing as Σvalue/Σspend rather than summing/averaging
 * the daily purchase_roas values (same reason as every other integration
 * page fixed this session).
 */
export default function MetaAdsDetail() {
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
    queryKey: ["fb-daily", connectionKey, accountId, rangeKey],
    queryFn: () =>
      runQuery<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        settings: SETTINGS,
        fields: [DAY, ...HERO_FIELDS],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });
  const sortedDailyRows = useMemo(
    () => (dailyRows ?? []).slice().sort((a, b) => String(a[DAY]).localeCompare(String(b[DAY]))),
    [dailyRows]
  );
  const sumField = (fieldId: string) => sortedDailyRows.reduce((s, r) => s + (Number(r[fieldId]) || 0), 0);
  const seriesFor = (fieldId: string) => sortedDailyRows.map((r) => Number(r[fieldId]) || 0);

  const totalSpend = sumField(SPEND);
  const totalPurchaseValue = sumField(PURCHASE_VALUE);
  // ROAS is a ratio — summing/averaging the daily purchase_roas values
  // would repeat the exact bug fixed elsewhere this session. Recomputed as
  // the true period total instead: Σ purchase value ÷ Σ spend.
  const roasTotal = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;
  const roasTrend = sortedDailyRows.map((r) => {
    const spend = Number(r[SPEND]) || 0;
    return { label: String(r[DAY]), value: spend > 0 ? (Number(r[PURCHASE_VALUE]) || 0) / spend : 0 };
  });
  const roasSeries = roasTrend.map((p) => p.value);
  const ctrSeries = seriesFor(CTR);
  const ctrAverage = ctrSeries.length ? ctrSeries.reduce((a, b) => a + b, 0) / ctrSeries.length : 0;

  const heroCandidates: HeroCandidate[] = [
    {
      key: "impressions",
      label: t("metaAds.impressions"),
      visualKeyword: "impressions",
      format: plainNumber,
      value: sumField(IMPRESSIONS),
      series: seriesFor(IMPRESSIONS),
    },
    {
      key: "spend",
      label: t("metaAds.spend"),
      visualKeyword: "spend",
      format: currency,
      value: totalSpend,
      series: seriesFor(SPEND),
    },
    {
      key: "purchases",
      label: t("metaAds.purchases"),
      visualKeyword: "purchase",
      format: plainNumber,
      value: sumField(PURCHASES),
      series: seriesFor(PURCHASES),
    },
    {
      key: "roas",
      label: t("metaAds.purchaseRoas"),
      visualKeyword: "roas",
      format: plainNumber,
      value: roasTotal,
      series: roasSeries,
    },
    {
      key: "linkClicks",
      label: t("metaAds.linkClicks"),
      visualKeyword: "click",
      format: plainNumber,
      value: sumField(LINK_CLICKS),
      series: seriesFor(LINK_CLICKS),
    },
    {
      key: "reach",
      label: t("metaAds.reach"),
      visualKeyword: "reach",
      format: plainNumber,
      value: sumField(REACH),
      series: seriesFor(REACH),
    },
    {
      key: "ctr",
      label: t("metaAds.ctr"),
      visualKeyword: "ctr",
      format: plainNumber,
      value: ctrAverage,
      series: ctrSeries,
    },
    {
      key: "clicks",
      label: t("metaAds.clicks"),
      visualKeyword: "click",
      format: plainNumber,
      value: sumField(CLICKS),
      series: seriesFor(CLICKS),
    },
  ];

  const { data: campaignRows, isFetching: campaignLoading, error: campaignError } = useQuery({
    queryKey: ["fb-campaigns", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        settings: SETTINGS,
        fields: [CAMPAIGN_NAME, IMPRESSIONS, SPEND, PURCHASES, ROAS],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });

  const anyError = heroError ?? campaignError;
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
          <h1 className="text-lg font-semibold">Meta Ads</h1>
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
            title={t("metaAds.campaignTable")}
            dimensionLabel={t("metaAds.campaign")}
            dimensionField={CAMPAIGN_NAME}
            defaultSortField={IMPRESSIONS}
            columns={[
              { id: IMPRESSIONS, label: t("metaAds.impressions") },
              { id: SPEND, label: t("metaAds.spend"), render: (v) => currency(Number(v)) },
              { id: PURCHASES, label: t("metaAds.purchases") },
              { id: ROAS, label: t("metaAds.purchaseRoas"), render: (v) => plainNumber(Number(v)) },
            ]}
            rows={campaignRows ?? []}
            loading={campaignLoading}
            emptyLabel={t("metaAds.noCampaigns")}
            searchPlaceholder={t("integrations.searchCampaigns")}
          />

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("metaAds.roasOverTime")}</h2>
            <RevenueChart data={roasTrend} shape="area" />
          </Card>
        </>
      )}
    </div>
  );
}
