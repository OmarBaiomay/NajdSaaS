import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

export function Topbar({ title }: { title: string }) {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);

  const handleLogout = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
        <Button variant="secondary" onClick={handleLogout}>
          {t("nav.logout")}
        </Button>
      </div>
    </header>
  );
}
