import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getIntegrationStatus, listIntegrations, listConnections } from "@/lib/reportingNinja";
import { getIntegrationVisual } from "@/lib/integrationIcons";

export default function IntegrationsOverview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: integrationState } = useQuery({ queryKey: ["reporting-ninja-status"], queryFn: getIntegrationStatus });
  const connected = integrationState?.status === "CONNECTED";

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["rn-integrations"],
    queryFn: listIntegrations,
    enabled: connected,
  });

  // How many real accounts are actually connected per integration — drives
  // both the "N accounts linked" badge and putting connected ones first.
  const { data: accountCounts, isLoading: countsLoading } = useQuery({
    queryKey: ["rn-integration-account-counts", integrations?.map((i) => i.id).join(",")],
    queryFn: async () => {
      const settled = await Promise.allSettled(integrations!.map((i) => listConnections(i.id)));
      const counts = new Map<string, number>();
      integrations!.forEach((integration, i) => {
        const result = settled[i];
        const connections = result.status === "fulfilled" ? result.value : [];
        counts.set(
          integration.id,
          connections.reduce((sum, c) => sum + c.accounts.length, 0)
        );
      });
      return counts;
    },
    enabled: connected && !!integrations && integrations.length > 0,
  });

  const sorted = useMemo(() => {
    if (!integrations) return [];
    return integrations.slice().sort((a, b) => (accountCounts?.get(b.id) ?? 0) - (accountCounts?.get(a.id) ?? 0));
  }, [integrations, accountCounts]);

  const filtered = sorted.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));

  if (!connected) {
    return (
      <Card className="text-center">
        <p className="text-sm text-slate-500">{t("integrations.connectFirst")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("integrations.searchPlaceholder")}
          className="w-full rounded-lg border border-slate-300 bg-transparent py-2 ps-9 pe-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
        />
      </div>

      {isLoading && <p className="text-sm text-slate-400">{t("common.loading")}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((integration) => {
          const visual = getIntegrationVisual(integration.id);
          const count = accountCounts?.get(integration.id) ?? 0;
          return (
            <button
              key={integration.id}
              onClick={() => navigate(`./${integration.id}`)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${visual.bg} ${visual.color}`}>
                {visual.icon}
              </span>
              <p className="mt-3 font-semibold text-slate-900 dark:text-white">{integration.name}</p>
              <p className="mt-1 text-xs text-slate-400 group-hover:text-brand-600">
                {countsLoading
                  ? t("common.loading")
                  : count > 0
                    ? t("dashboard.accountCount", { count })
                    : t("integrations.noAccountsLinked")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
