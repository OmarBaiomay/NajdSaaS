import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Building2, Users, ShieldCheck } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { Card } from "@/components/ui/Card";
import { DashboardBackdrop } from "@/components/layout/DashboardBackdrop";
import { getMyAgency } from "@/lib/agencies";
import { listTenants } from "@/lib/tenants";

const STATUS_TONE: Record<string, "brand" | "amber" | "rose"> = {
  ACTIVE: "brand",
  TRIAL: "amber",
  SUSPENDED: "rose",
};

export default function AgencyDashboard() {
  const { t } = useTranslation();

  const { data: agency } = useQuery({ queryKey: ["agency-me"], queryFn: getMyAgency });
  const { data: tenants } = useQuery({ queryKey: ["tenants"], queryFn: listTenants });

  // Tenants created per month, straight from real data — no mock series.
  const tenantsByMonth = useMemo(() => {
    if (!tenants) return [];
    const counts = new Map<string, number>();
    for (const tenant of tenants) {
      const key = tenant.createdAt.slice(0, 7); // YYYY-MM
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ label: month, value }));
  }, [tenants]);

  return (
    <DashboardBackdrop>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlowCard label={t("dashboard.totalTenants")} value={agency?._count.tenants ?? "–"} icon={<Building2 size={18} />} accent="brand" />
        <GlowCard label={t("dashboard.totalUsers")} value={agency?._count.users ?? "–"} icon={<Users size={18} />} accent="violet" />
        <GlowCard
          label={t("dashboard.agencyStatus")}
          value={agency ? t(`dashboard.status.${agency.status}`) : "–"}
          icon={<ShieldCheck size={18} />}
          accent={agency ? STATUS_TONE[agency.status] : "brand"}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t("dashboard.tenantsCreatedByMonth")}
        </h2>
        {tenantsByMonth.length > 0 ? (
          <RevenueChart data={tenantsByMonth} />
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">{t("dashboard.noTenantsYet")}</p>
        )}
      </div>

      <Card>
        <p className="text-sm text-slate-500">
          {t("dashboard.viewAsHint")}{" "}
          <Link to="/agency/tenants" className="font-medium text-brand-600 hover:underline">
            {t("nav.tenants")}
          </Link>
        </p>
      </Card>
    </DashboardBackdrop>
  );
}
