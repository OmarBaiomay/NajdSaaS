import { SAR_GLYPH, isSarCurrency, formatCurrency, formatPlainAmount } from "@/lib/currency";

/** The official new Saudi Riyal symbol (SAMA, 2025), rendered via a custom
 * font mapped to a private-use codepoint — not a real "ê". Screen readers
 * get "Saudi Riyal" instead of that raw glyph. */
export function SarSymbol({ className = "" }: { className?: string }) {
  return (
    <span className={`font-sar ${className}`} role="img" aria-label="Saudi Riyal">
      {SAR_GLYPH}
    </span>
  );
}

/**
 * Renders a monetary value in its real currency. For SAR specifically, uses
 * the official symbol per SAMA's placement guidelines (symbol first, a
 * space, then the number — following the surrounding text direction).
 * Every other currency falls back to Intl's own formatting (e.g. "$9,497.70").
 */
export function CurrencyAmount({
  value,
  currencyCode,
  locale,
}: {
  value: number;
  currencyCode: string | undefined;
  locale: string;
}) {
  if (isSarCurrency(currencyCode)) {
    return (
      <span className="inline-flex items-baseline gap-1">
        <SarSymbol />
        <span>{formatPlainAmount(value, locale)}</span>
      </span>
    );
  }
  return <>{formatCurrency(value, currencyCode, locale)}</>;
}
