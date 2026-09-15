export type ThemeAccent = "blue" | "violet" | "emerald" | "sky" | "rose" | "amber";

export const DEFAULT_ACCENT: ThemeAccent = "blue";

/** Must match the `:root[data-accent="..."]` blocks in index.css. `swatch` is
 * a plain hex (that accent's 500 shade) for rendering the picker's preview
 * dot — a static value is fine there since it's only ever shown at one size
 * against either background, unlike the CSS-variable scale used everywhere
 * else in the app. */
export const ACCENT_PRESETS: { id: ThemeAccent; labelKey: string; swatch: string }[] = [
  { id: "blue", labelKey: "appearance.accents.blue", swatch: "#3380ff" },
  { id: "violet", labelKey: "appearance.accents.violet", swatch: "#8b5cf6" },
  { id: "emerald", labelKey: "appearance.accents.emerald", swatch: "#10b981" },
  { id: "sky", labelKey: "appearance.accents.sky", swatch: "#0ea5e9" },
  { id: "rose", labelKey: "appearance.accents.rose", swatch: "#f43f5e" },
  { id: "amber", labelKey: "appearance.accents.amber", swatch: "#f59e0b" },
];

export function isThemeAccent(value: string | null): value is ThemeAccent {
  return !!value && ACCENT_PRESETS.some((p) => p.id === value);
}
