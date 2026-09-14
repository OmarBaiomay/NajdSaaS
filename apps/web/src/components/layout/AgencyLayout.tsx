import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";

const AGENCY_NAV: NavItem[] = [
  { to: "/agency", labelKey: "nav.dashboard", icon: "📊" },
  { to: "/agency/tenants", labelKey: "nav.tenants", icon: "🏢" },
  { to: "/agency/users", labelKey: "nav.users", icon: "👥" },
  { to: "/agency/settings", labelKey: "nav.settings", icon: "⚙️" },
];

export function AgencyLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar items={AGENCY_NAV} scopeLabel="Agency" />
      <div className="flex flex-1 flex-col">
        <Topbar title={t("dashboard.agencyOverview")} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
