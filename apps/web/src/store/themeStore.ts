import { create } from "zustand";
import { DEFAULT_ACCENT, isThemeAccent, type ThemeAccent } from "@/lib/themePresets";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const media = window.matchMedia("(prefers-color-scheme: dark)");

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? (media.matches ? "dark" : "light") : preference;
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// Every accent preset defines both a light-mode and dark-mode-friendly scale
// (see the :root[data-accent="…"] blocks in index.css) — components already
// pick the right shade per mode via their own dark: classes, so switching
// the accent is orthogonal to switching light/dark and just sets one
// attribute here.
function applyAccent(accent: ThemeAccent) {
  document.documentElement.setAttribute("data-accent", accent);
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

function getStoredAccent(): ThemeAccent {
  try {
    const stored = localStorage.getItem("najd-theme-accent");
    if (isThemeAccent(stored)) return stored;
  } catch {
    /* private mode / storage disabled */
  }
  return DEFAULT_ACCENT;
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  accent: ThemeAccent;
  setPreference: (preference: ThemePreference) => void;
  setAccent: (accent: ThemeAccent) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialPreference = getStoredPreference();
  const initialResolved = resolve(initialPreference);
  applyResolvedTheme(initialResolved);

  const initialAccent = getStoredAccent();
  applyAccent(initialAccent);

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
    accent: initialAccent,
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
    setAccent: (accent) => {
      applyAccent(accent);
      try {
        localStorage.setItem("najd-theme-accent", accent);
      } catch {
        /* private mode / storage disabled — preference just won't persist */
      }
      set({ accent });
    },
  };
});
