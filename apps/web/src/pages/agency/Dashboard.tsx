import { useTranslation } from "react-i18next";
import { Eye, DollarSign, Building2, Users } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlowCard label={t("dashboard.totalViews")} value="12.4K" delta={{ value: "0.43%", positive: true }} icon={<Eye size={18} />} accent="brand" />
        <GlowCard label={t("dashboard.revenue")} value="$34,900" delta={{ value: "12%", positive: true }} icon={<DollarSign size={18} />} accent="teal" />
        <GlowCard label={t("dashboard.activeTenants")} value="18" delta={{ value: "+2", positive: true }} icon={<Building2 size={18} />} accent="violet" />
        <GlowCard label={t("dashboard.activeUsers")} value="243" delta={{ value: "+31", positive: true }} icon={<Users size={18} />} accent="amber" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("dashboard.revenue")}</h2>
        <RevenueChart data={MOCK_REVENUE} />
      </div>
    </div>
  );
}
