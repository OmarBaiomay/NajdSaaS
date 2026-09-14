import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Building2, Users, Settings, Plug, KeyRound } from "lucide-react";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ViewAsSwitcher } from "./ViewAsSwitcher";
import { useViewAsStore } from "@/store/viewAsStore";

export function AgencyLayout() {
  const { t } = useTranslation();
  const { tenantId, tenantName } = useViewAsStore();

  const nav: NavItem[] = [
    { to: "/agency", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    { to: "/agency/tenants", labelKey: "nav.tenants", icon: Building2 },
    { to: "/agency/integrations", labelKey: "nav.integrations", icon: Plug, disabled: !tenantId },
    { to: "/agency/tenant-settings", labelKey: "nav.tenantApiKey", icon: KeyRound, disabled: !tenantId },
    { to: "/agency/users", labelKey: "nav.users", icon: Users },
    { to: "/agency/settings", labelKey: "nav.settings", icon: Settings },
  ];

  const title = tenantId ? `${t("viewAs.viewingAs")}: ${tenantName}` : t("dashboard.agencyOverview");

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar items={nav} scopeLabel={t("viewAs.agency")} header={<ViewAsSwitcher />} />
      <div className="flex flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
