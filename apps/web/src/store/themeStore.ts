import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const media = window.matchMedia("(prefers-color-scheme: dark)");

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? (media.matches ? "dark" : "light") : preference;
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function getStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem("najd-theme") as ThemePreference | null;
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* private mode / storage disabled */
  }
  return "system";
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialPreference = getStoredPreference();
  const initialResolved = resolve(initialPreference);
  applyResolvedTheme(initialResolved);

  media.addEventListener("change", () => {
    const current = getStoredPreference();
    if (current === "system") {
      const next = resolve("system");
      applyResolvedTheme(next);
      set({ resolved: next });
    }
  });

  return {
    preference: initialPreference,
    resolved: initialResolved,
    setPreference: (preference) => {
      const resolved = resolve(preference);
      applyResolvedTheme(resolved);
      try {
        localStorage.setItem("najd-theme", preference);
      } catch {
        /* private mode / storage disabled — preference just won't persist */
      }
      set({ preference, resolved });
    },
  };
});
