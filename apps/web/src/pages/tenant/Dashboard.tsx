import { useTranslation } from "react-i18next";
import { DollarSign, Users, Sparkles } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
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
        <GlowCard label={t("dashboard.revenue")} value="$7,730" delta={{ value: "9%", positive: true }} icon={<DollarSign size={18} />} accent="brand" />
        <GlowCard label={t("dashboard.activeUsers")} value="12" delta={{ value: "+1", positive: true }} icon={<Users size={18} />} accent="teal" />
        <GlowCard label={t("dashboard.plan")} value="Growth" icon={<Sparkles size={18} />} accent="violet" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("dashboard.revenue")}</h2>
        <RevenueChart data={MOCK_REVENUE} />
      </div>
    </div>
  );
}
