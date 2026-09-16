import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Users2, MousePointerClick, ShoppingBag, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlowCard } from "@/components/ui/GlowCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateRangePicker, DEFAULT_DATE_RANGE, type DateRangeValue } from "@/components/ui/DateRangePicker";
import { CurrencyAmount } from "@/components/ui/SarSymbol";
import { MetricDonutChart } from "@/components/charts/MetricDonutChart";
import { BreakdownTable } from "@/components/integrations/BreakdownTable";
import { useAccountSelector } from "@/hooks/useAccountSelector";
import { runQuery } from "@/lib/reportingNinja";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { getIntegrationVisual } from "@/lib/integrationIcons";
import { extractApiErrorMessage } from "@/lib/reportingNinjaErrors";
import { topNWithOthers } from "@/lib/topNWithOthers";

const INTEGRATION_ID = "ga4";

/**
 * Hand-built Google Analytics 4 page, mirroring the tenant's existing
 * Looker Studio "GA4" report card-for-card and chart-for-chart instead of
 * the generic auto-picked layout every other integration gets — the first
 * of what will be a small registry of per-integration custom pages (see
 * pages/integrations/custom/registry.tsx).
 *
 * Field choices confirmed against the live GA4 field catalog + the user:
 *   Purchase        → totalPurchasers
 *   Total revenue   → totalRevenue
 *   Total users     → totalUsers
 *   Sessions        → sessions
 *   Table           → sessionSourceMedium × [eventCount, eventValue]
 *   Pie: city       → city, sized by sessions (assumption — not shown in
 *                      the reference screenshot's cropped chart titles)
 *   Pie: item       → itemName, sized by itemRevenue (assumption)
 *   Pie: campaign   → sessionCampaignName, sized by sessions (confirmed
 *                      title: "Session campaign")
 * The two "assumption" metrics are easy to swap if wrong — say which chart
 * and what it should be sized by instead.
 */
export default function GoogleAnalyticsDetail() {
  const { t, i18n } = useTranslation();
  const visual = getIntegrationVisual(INTEGRATION_ID);

  const { connectionKey, accountId, accountOptions, connectionsLoading, selectAccount, selectedCurrency } =
    useAccountSelector(INTEGRATION_ID);

  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const dateRangeReady = dateRange.preset !== "custom" || (!!dateRange.start && !!dateRange.end);
  const queryEnabled = dateRangeReady && !!connectionKey && !!accountId;
  const rangeKey = JSON.stringify(dateRange);

  // Metrics-only (no dimension) — Reporting Ninja returns one aggregate row
  // for the whole range directly, which matters here: "Total users" is a
  // distinct-user count, so summing per-day active users (the generic
  // page's approach) would wildly overcount anyone active more than once.
  const { data: heroRow, isFetching: heroLoading, error: heroError } = useQuery({
    queryKey: ["ga4-hero", connectionKey, accountId, rangeKey],
    queryFn: async () => {
      const rows = await runQuery<Record<string, number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        fields: ["totalUsers", "sessions", "totalRevenue", "totalPurchasers"],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1,
      });
      return rows[0] ?? {};
    },
    enabled: queryEnabled,
  });

  const { data: sourceMediumRows, isFetching: sourceMediumLoading, error: sourceMediumError } = useQuery({
    queryKey: ["ga4-source-medium", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        fields: ["sessionSourceMedium", "eventCount", "eventValue"],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });

  const { data: cityRows, error: cityError } = useQuery({
    queryKey: ["ga4-city", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        fields: ["city", "sessions"],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });

  const { data: itemRows, error: itemError } = useQuery({
    queryKey: ["ga4-item", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        fields: ["itemName", "itemRevenue"],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });

  const { data: campaignRows, error: campaignError } = useQuery({
    queryKey: ["ga4-campaign", connectionKey, accountId, rangeKey],
    queryFn: () =>
      fetchAllRows<Record<string, string | number>>({
        integration_id: INTEGRATION_ID,
        connection_key: connectionKey,
        account_id: accountId,
        fields: ["sessionCampaignName", "sessions"],
        date_range: dateRange as unknown as Record<string, unknown>,
        limit: 1000,
      }),
    enabled: queryEnabled,
  });

  const anyError = heroError ?? sourceMediumError ?? cityError ?? itemError ?? campaignError;
  const errorMessage = anyError ? extractApiErrorMessage(anyError) ?? t("integrations.loadError") : undefined;

  const citySlices = useMemo(
    () => topNWithOthers(cityRows ?? [], "city", "sessions", 9, t("ga4.others")),
    [cityRows, t]
  );
  const itemSlices = useMemo(
    () => topNWithOthers(itemRows ?? [], "itemName", "itemRevenue", 9, t("ga4.others")),
    [itemRows, t]
  );
  const campaignSlices = useMemo(
    () => topNWithOthers(campaignRows ?? [], "sessionCampaignName", "sessions", 9, t("ga4.others")),
    [campaignRows, t]
  );

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
          <h1 className="text-lg font-semibold">Google Analytics 4</h1>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GlowCard
              label={t("ga4.purchases")}
              value={(heroRow?.totalPurchasers ?? 0).toLocaleString(i18n.language)}
              icon={<ShoppingBag size={16} />}
              accent="orange"
              loading={heroLoading}
            />
            <GlowCard
              label={t("ga4.totalRevenue")}
              value={<CurrencyAmount value={heroRow?.totalRevenue ?? 0} currencyCode={selectedCurrency} locale={i18n.language} />}
              icon={<Wallet size={16} />}
              accent="emerald"
              loading={heroLoading}
            />
            <GlowCard
              label={t("ga4.totalUsers")}
              value={(heroRow?.totalUsers ?? 0).toLocaleString(i18n.language)}
              icon={<Users2 size={16} />}
              accent="violet"
              loading={heroLoading}
            />
            <GlowCard
              label={t("ga4.sessions")}
              value={(heroRow?.sessions ?? 0).toLocaleString(i18n.language)}
              icon={<MousePointerClick size={16} />}
              accent="sky"
              loading={heroLoading}
            />
          </div>

          <BreakdownTable
            title={t("ga4.sourceMediumTable")}
            dimensionLabel={t("ga4.sourceMedium")}
            dimensionField="sessionSourceMedium"
            columns={[
              { id: "eventCount", label: t("ga4.eventCount") },
              {
                id: "eventValue",
                label: t("ga4.eventValue"),
                render: (v) => <CurrencyAmount value={v} currencyCode={selectedCurrency} locale={i18n.language} />,
              },
            ]}
            rows={sourceMediumRows ?? []}
            loading={sourceMediumLoading}
            emptyLabel={t("ga4.noSourceMedium")}
            searchPlaceholder={t("ga4.searchSourceMedium")}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("ga4.byCity")}</h2>
              <MetricDonutChart slices={citySlices} />
            </Card>
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("ga4.byItem")}</h2>
              <MetricDonutChart slices={itemSlices} />
            </Card>
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("ga4.byCampaign")}</h2>
              <MetricDonutChart slices={campaignSlices} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
