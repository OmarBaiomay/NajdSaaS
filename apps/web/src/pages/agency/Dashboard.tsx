import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/ui/Card";
import { RevenueChart } from "@/components/charts/RevenueChart";

const MOCK_REVENUE = [
  { label: "Jan", value: 4200 },
  { label: "Feb", value: 5100 },
  { label: "Mar", value: 4800 },
  { label: "Apr", value: 6200 },
  { label: "May", value: 7000 },
  { label: "Jun", value: 7600 },
];

export default function AgencyDashboard() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("dashboard.revenue")} value="$34,900" hint="+12% MoM" />
        <StatCard label={t("dashboard.activeTenants")} value="18" hint="+2 this month" />
        <StatCard label={t("dashboard.activeUsers")} value="243" hint="+31 this month" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("dashboard.revenue")}</h2>
        <RevenueChart data={MOCK_REVENUE} />
      </div>
    </div>
  );
}
