import { CURRENCY_SYMBOL_MAP } from "./currencySymbolMap";

// Keyword heuristic, same style as the icon/tone matching in metricVisuals —
// Reporting Ninja doesn't expose a "this field is money" flag, so we infer
// it from the name. Explicitly excludes ratios/percentages that happen to
// share a word (Purchase ROAS, Conversion Rate) so they don't get a $ sign.
const CURRENCY_KEYWORDS = /\b(cost|spend|spent|budget|revenue|value|price|arppu|cpc|cpm|cpa|cpl)\b/i;
const CURRENCY_EXCLUDE = /\b(rate|ratio|roas|percentage)\b/i;

export function isCurrencyMetric(fieldName: string): boolean {
  return CURRENCY_KEYWORDS.test(fieldName) && !CURRENCY_EXCLUDE.test(fieldName);
}

// The official new Saudi Riyal symbol (SAMA, 2025) — a custom font maps
// this private-use codepoint to the glyph. See components/ui/SarSymbol.tsx.
export const SAR_GLYPH = "ê";

export function isSarCurrency(currencyCode: string | undefined): boolean {
  return !!currencyCode && (currencyCode.toUpperCase() === "SAR" || currencyCode.toUpperCase() === "SR");
}

/** The bare number, with no currency marker — used alongside <SarSymbol />
 * since the official symbol replaces the "SAR"/ر.س text entirely. */
export function formatPlainAmount(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

/** Formats a monetary value using the connected account's real currency
 * (from Reporting Ninja) rather than assuming USD.
 *
 * CURRENCY_SYMBOL_MAP wins whenever we have the code, deliberately ahead of
 * Intl — confirmed Intl.NumberFormat's own symbol is locale-dependent in a
 * way that produces inconsistent, verbose results for the exact same
 * currency: USD under the "ar" locale renders as "US$" (plus a stray
 * invisible RTL mark) even with currencyDisplay:"narrowSymbol", while "en"
 * correctly gives "$". Our table is a fixed, minimal symbol per currency
 * regardless of UI language. Intl is the fallback only for codes we don't
 * have — where it may still print the bare ISO code if it has no symbol
 * data either (e.g. AED, KWD — not in the supplied table). */
export function formatCurrency(value: number, currencyCode: string | undefined, locale: string): string {
  if (!currencyCode) {
    return value.toLocaleString(locale, { maximumFractionDigits: 2 });
  }
  const code = currencyCode.toUpperCase();
  const number = formatPlainAmount(value, locale);

  if (CURRENCY_SYMBOL_MAP[code]) {
    return `${CURRENCY_SYMBOL_MAP[code]} ${number}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${number} ${currencyCode}`;
  }
}
