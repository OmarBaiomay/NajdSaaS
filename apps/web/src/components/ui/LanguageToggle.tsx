import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const next = i18n.language === "ar" ? "en" : "ar";

  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {t(`language.${next}`)}
    </button>
  );
}
