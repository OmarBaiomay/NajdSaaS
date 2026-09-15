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
 * Intl.NumberFormat has no symbol data for a lot of real-world currencies
 * (AED, KWD, and plenty more) and silently falls back to printing the bare
 * ISO code instead — exactly the "text, not a symbol" problem. So: ask Intl
 * first, and if it actually produced a symbol, use it; if it just echoed
 * the code back, fall through to CURRENCY_SYMBOL_MAP instead. Only when
 * neither has anything does the code itself show up. */
export function formatCurrency(value: number, currencyCode: string | undefined, locale: string): string {
  if (!currencyCode) {
    return value.toLocaleString(locale, { maximumFractionDigits: 2 });
  }
  const code = currencyCode.toUpperCase();
  const number = formatPlainAmount(value, locale);

  try {
    // narrowSymbol prefers the plain symbol ("$") over a verbose form like
    // "US$" where locale data offers both.
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    });
    const currencyPart = formatter.formatToParts(value).find((p) => p.type === "currency")?.value;
    const gotRealSymbol = currencyPart && currencyPart.toUpperCase() !== code;

    if (gotRealSymbol) return formatter.format(value);
    if (CURRENCY_SYMBOL_MAP[code]) return `${CURRENCY_SYMBOL_MAP[code]} ${number}`;
    return formatter.format(value); // no fallback available — the code is genuinely all we have
  } catch {
    return CURRENCY_SYMBOL_MAP[code] ? `${CURRENCY_SYMBOL_MAP[code]} ${number}` : `${number} ${currencyCode}`;
  }
}
