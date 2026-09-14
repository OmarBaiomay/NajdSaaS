import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/ui/Card";
import { RevenueChart } from "@/components/charts/RevenueChart";

const MOCK_REVENUE = [
  { label: "Jan", value: 900 },
  { label: "Feb", value: 1100 },
  { label: "Mar", value: 980 },
  { label: "Apr", value: 1400 },
  { label: "May", value: 1600 },
  { label: "Jun", value: 1750 },
];

export default function TenantDashboard() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("dashboard.revenue")} value="$7,730" hint="+9% MoM" />
        <StatCard label={t("dashboard.activeUsers")} value="12" hint="+1 this month" />
        <StatCard label="Plan" value="Growth" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("dashboard.revenue")}</h2>
        <RevenueChart data={MOCK_REVENUE} />
      </div>
    </div>
  );
}
