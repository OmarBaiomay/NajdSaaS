import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { Mail, Lock, Sparkles, Plug, ShieldCheck, CalendarRange } from "lucide-react";
import { HeroScene } from "@/components/three/HeroScene";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { api } from "@/lib/api";
import { useAuthStore, isAgencyLevel } from "@/store/authStore";

const FEATURES = [
  { icon: Plug, key: "auth.feature1" },
  { icon: ShieldCheck, key: "auth.feature2" },
  { icon: CalendarRange, key: "auth.feature3" },
] as const;

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const formRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/login", { email, password });
      const { data } = await api.get("/auth/me");
      setUser(data.auth);
      navigate(isAgencyLevel(data.auth.role) ? "/agency" : "/tenant");
    } catch {
      setError(t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      <div className="absolute end-6 top-6 z-20 flex gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Brand panel — hidden on small screens, mirrors to the trailing side
          automatically under RTL since this is a flex row. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-40">
          <HeroScene />
        </div>

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Sparkles size={18} />
          </span>
          <span className="text-lg font-bold">{t("app.name")}</span>
        </div>

        <div className="relative z-10 max-w-sm">
          <h2 className="text-3xl font-bold leading-tight">{t("auth.brandHeadline")}</h2>
          <p className="mt-3 text-sm text-white/60">{t("auth.brandSubtext")}</p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-start gap-3 text-sm text-white/80">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon size={14} />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} {t("app.name")}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div ref={formRef} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
              <Sparkles size={18} />
            </span>
            <span className="text-lg font-bold text-brand-600">{t("app.name")}</span>
          </div>

          <h1 className="text-2xl font-bold">{t("auth.welcomeBack")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("auth.loginSubtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.email")}</label>
              <div className="relative">
                <Mail size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-transparent py-2.5 ps-9 pe-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.password")}</label>
              <PasswordInput
                icon={Lock}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-2.5 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" variant="gradient" className="w-full py-2.5" disabled={loading}>
              {loading ? "…" : t("auth.login")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
