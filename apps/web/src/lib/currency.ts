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
 * (from Reporting Ninja) rather than assuming USD. Falls back to a plain
 * number — with the raw currency code appended — if the account's currency
 * isn't known yet or isn't a currency Intl recognizes. */
export function formatCurrency(value: number, currencyCode: string | undefined, locale: string): string {
  if (!currencyCode) {
    return value.toLocaleString(locale, { maximumFractionDigits: 2 });
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currencyCode}`;
  }
}
