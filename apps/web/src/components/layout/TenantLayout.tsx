import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Plug, Users, Settings } from "lucide-react";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";

const TENANT_NAV: NavItem[] = [
  { to: "/tenant", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/tenant/integrations", labelKey: "nav.integrations", icon: Plug },
  { to: "/tenant/users", labelKey: "nav.users", icon: Users },
  { to: "/tenant/settings", labelKey: "nav.settings", icon: Settings },
];

export function TenantLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar items={TENANT_NAV} scopeLabel={t("viewAs.tenant")} />
      <div className="flex flex-1 flex-col">
        <Topbar title={t("dashboard.tenantOverview")} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
