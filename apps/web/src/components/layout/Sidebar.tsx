import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { clsx } from "@/lib/clsx";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
}

export function Sidebar({ items, scopeLabel }: { items: NavItem[]; scopeLabel: string }) {
  const { t } = useTranslation();

  return (
    <aside className="hidden w-64 shrink-0 border-e border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
      <div className="flex h-16 items-center px-5">
        <span className="text-lg font-bold text-brand-600">{t("app.name")}</span>
      </div>
      <p className="px-5 pb-2 text-xs font-medium uppercase tracking-wider text-slate-400">{scopeLabel}</p>
      <nav className="flex flex-col gap-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )
            }
          >
            <span aria-hidden>{item.icon}</span>
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
