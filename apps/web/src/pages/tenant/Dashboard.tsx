import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Plug, Building2, Wallet, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlowCard } from "@/components/ui/GlowCard";
import { CurrencyAmount } from "@/components/ui/SarSymbol";
import { DateRangePicker, dateRangeLabel, DEFAULT_DATE_RANGE, type DateRangeValue } from "@/components/ui/DateRangePicker";
import { DashboardBackdrop } from "@/components/layout/DashboardBackdrop";
import {
  getIntegrationStatus,
  listIntegrationsWithAccountCounts,
  INTEGRATIONS_WITH_COUNTS_QUERY_KEY,
} from "@/lib/reportingNinja";
import { getDashboardFinancials, type CurrencyTotal } from "@/lib/dashboardFinancials";
import { getIntegrationVisual } from "@/lib/integrationIcons";

/** Splits currency totals into "the biggest one" (shown as the headline
 * figure) and the rest (shown as a small "+ ..." footer) — accounts under
 * the same tenant can genuinely run in different currencies, so summing
 * them into one blended number would be meaningless. */
function splitByPrimary(totals: CurrencyTotal[], field: "cost" | "revenue") {
  const nonZero = totals.filter((t) => t[field] !== 0).sort((a, b) => b[field] - a[field]);
  return { primary: nonZero[0], rest: nonZero.slice(1) };
}

export default function TenantDashboard() {
  const { t, i18n } = useTranslation();

  const { data: integrationState, isLoading: statusLoading } = useQuery({
    queryKey: ["reporting-ninja-status"],
    queryFn: getIntegrationStatus,
  });
  const connected = integrationState?.status === "CONNECTED";

  // Real data, not a fixed 5 metrics — every integration in this tenant's
  // Reporting Ninja account that actually has connected accounts. Shares its
  // query key + a long staleTime with the Accounts overview page, so
  // switching between them doesn't re-fire ~25 /connections calls each time.
  const { data: allIntegrations, isLoading: integrationsLoading } = useQuery({
    queryKey: INTEGRATIONS_WITH_COUNTS_QUERY_KEY,
    queryFn: listIntegrationsWithAccountCounts,
    enabled: connected,
    staleTime: 5 * 60 * 1000,
  });

  const connectedIntegrations = allIntegrations
    ?.filter((i) => i.accountCount > 0)
    .sort((a, b) => b.accountCount - a.accountCount);

  const totalAccounts = connectedIntegrations?.reduce((sum, i) => sum + i.accountCount, 0) ?? 0;

  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const dateRangeReady = dateRange.preset !== "custom" || (!!dateRange.start && !!dateRange.end);

  // Cost/revenue across every connected integration's every account, for the
  // selected date range — expensive (a /fields + /query per account), so
  // cached for a while and only computed once the connected-integrations
  // list and a usable date range are both known.
  const { data: financials, isLoading: financialsLoading } = useQuery({
    queryKey: [
      "dashboard-financials",
      connectedIntegrations?.map((i) => i.id).join(","),
      JSON.stringify(dateRange),
    ],
    queryFn: () =>
      getDashboardFinancials(
        connectedIntegrations!.map((i) => ({ id: i.id, name: i.name })),
        dateRange as unknown as Record<string, unknown>
      ),
    enabled: (connectedIntegrations?.length ?? 0) > 0 && dateRangeReady,
    staleTime: 5 * 60 * 1000,
  });

  const costSplit = splitByPrimary(financials?.grandTotal ?? [], "cost");
  const revenueSplit = splitByPrimary(financials?.grandTotal ?? [], "revenue");

  if (statusLoading) return null;

  if (!connected) {
    return (
      <DashboardBackdrop>
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <Plug size={28} className="text-slate-300" />
          <p className="text-sm text-slate-500">{t("integrations.connectFirst")}</p>
          <Link to="/tenant/settings" className="mt-1 text-sm font-medium text-brand-600 hover:underline">
            {t("nav.settings")} →
          </Link>
        </Card>
      </DashboardBackdrop>
    );
  }

  const otherCurrencies = (rest: CurrencyTotal[], field: "cost" | "revenue") =>
    rest.length > 0 ? (
      <p className="flex flex-wrap gap-x-2 text-xs text-slate-400">
        {rest.map((t) => (
          <span key={t.currency}>
            + <CurrencyAmount value={t[field]} currencyCode={t.currency} locale={i18n.language} />
          </span>
        ))}
      </p>
    ) : undefined;

  return (
    <DashboardBackdrop>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-xs text-slate-400">
          {t("dashboard.financialsHint", { range: dateRangeLabel(dateRange, t) })}
        </p>
        <DateRangePicker label={t("integrations.dateRange")} value={dateRange} onChange={setDateRange} />
      </div>

      {/* items-start: don't stretch every card to match the tallest one in
          the row — a card with a longer label or a multi-currency footer
          shouldn't leave dead space in its plain-number siblings. */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlowCard
          label={t("dashboard.connectedIntegrations")}
          value={connectedIntegrations?.length ?? (integrationsLoading ? "…" : 0)}
          icon={<Plug size={18} />}
          accent="brand"
        />
        <GlowCard
          label={t("dashboard.totalAccounts")}
          value={totalAccounts}
          icon={<Building2 size={18} />}
          accent="teal"
        />
        <GlowCard
          label={t("dashboard.totalCost")}
          value={
            costSplit.primary ? (
              <CurrencyAmount value={costSplit.primary.cost} currencyCode={costSplit.primary.currency} locale={i18n.language} />
            ) : (
              "—"
            )
          }
          icon={<Wallet size={18} />}
          accent="emerald"
          footer={otherCurrencies(costSplit.rest, "cost")}
          loading={financialsLoading}
        />
        <GlowCard
          label={t("dashboard.totalRevenue")}
          value={
            revenueSplit.primary ? (
              <CurrencyAmount value={revenueSplit.primary.revenue} currencyCode={revenueSplit.primary.currency} locale={i18n.language} />
            ) : (
              "—"
            )
          }
          icon={<TrendingUp size={18} />}
          accent="violet"
          footer={otherCurrencies(revenueSplit.rest, "revenue")}
          loading={financialsLoading}
        />
      </div>

      {integrationsLoading && <p className="text-sm text-slate-400">{t("common.loading")}</p>}

      {!integrationsLoading && connectedIntegrations?.length === 0 && (
        <Card className="text-center text-sm text-slate-500">{t("dashboard.noDataSources")}</Card>
      )}

      {(financials?.perIntegration.length ?? 0) > 0 && (
        <Card className="overflow-x-auto !p-0">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {t("dashboard.costRevenueByIntegration")}
            </h2>
          </div>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 text-start font-medium">{t("dashboard.integration")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("dashboard.cost")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("dashboard.revenue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {financials!.perIntegration.map((item) => {
                const visual = getIntegrationVisual(item.integrationId);
                const costs = item.byCurrency.filter((c) => c.cost !== 0);
                const revenues = item.byCurrency.filter((c) => c.revenue !== 0);
                return (
                  <tr key={item.integrationId}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/tenant/integrations/${item.integrationId}`}
                        className="flex items-center gap-2 hover:text-brand-600"
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${visual.bg} ${visual.color}`}>
                          {visual.icon}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {item.hasCost && costs.length > 0 ? (
                        costs.map((c) => (
                          <div key={c.currency}>
                            <CurrencyAmount value={c.cost} currencyCode={c.currency} locale={i18n.language} />
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.hasRevenue && revenues.length > 0 ? (
                        revenues.map((c) => (
                          <div key={c.currency}>
                            <CurrencyAmount value={c.revenue} currencyCode={c.currency} locale={i18n.language} />
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {(connectedIntegrations?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {connectedIntegrations!.map((integration) => {
            const visual = getIntegrationVisual(integration.id);
            return (
              <Link
                key={integration.id}
                to={`/tenant/integrations/${integration.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${visual.bg} ${visual.color}`}>
                  {visual.icon}
                </span>
                <p className="mt-3 font-semibold text-slate-900 dark:text-white">{integration.name}</p>
                <p className="mt-1 text-xs text-slate-400 group-hover:text-brand-600">
                  {t("dashboard.accountCount", { count: integration.accountCount })}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardBackdrop>
  );
}
