import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Plug, Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlowCard } from "@/components/ui/GlowCard";
import { DashboardBackdrop } from "@/components/layout/DashboardBackdrop";
import { getIntegrationStatus, listIntegrations, listConnections } from "@/lib/reportingNinja";
import { getIntegrationVisual } from "@/lib/integrationIcons";

export default function TenantDashboard() {
  const { t } = useTranslation();

  const { data: integrationState, isLoading: statusLoading } = useQuery({
    queryKey: ["reporting-ninja-status"],
    queryFn: getIntegrationStatus,
  });
  const connected = integrationState?.status === "CONNECTED";

  // Real data, not a fixed 5 metrics — every integration in this tenant's
  // Reporting Ninja account that actually has connected accounts.
  const { data: connectedIntegrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ["tenant-dashboard-integrations"],
    queryFn: async () => {
      const integrations = await listIntegrations();
      const settled = await Promise.allSettled(integrations.map((i) => listConnections(i.id)));
      return integrations
        .map((integration, i) => {
          const result = settled[i];
          const connections = result.status === "fulfilled" ? result.value : [];
          const accountCount = connections.reduce((sum, c) => sum + c.accounts.length, 0);
          return { ...integration, accountCount };
        })
        .filter((i) => i.accountCount > 0)
        .sort((a, b) => b.accountCount - a.accountCount);
    },
    enabled: connected,
  });

  const totalAccounts = connectedIntegrations?.reduce((sum, i) => sum + i.accountCount, 0) ?? 0;

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

  return (
    <DashboardBackdrop>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      {integrationsLoading && <p className="text-sm text-slate-400">{t("common.loading")}</p>}

      {!integrationsLoading && connectedIntegrations?.length === 0 && (
        <Card className="text-center text-sm text-slate-500">{t("dashboard.noDataSources")}</Card>
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
