import { useState, forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "@/lib/clsx";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className = "", icon: Icon, ...props },
  ref
) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {Icon && <Icon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />}
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className={clsx(
          "w-full rounded-lg border border-slate-300 bg-transparent py-2 pe-10 text-sm outline-none focus:border-brand-500 dark:border-slate-700",
          Icon ? "ps-9" : "ps-3",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
});
