import {
  listConnections,
  listFields,
  runQuery,
  getIntegrationDetail,
  type RnField,
} from "./reportingNinja";
import { pickTimeDimension } from "./timeDimension";

const COST_PATTERN = /\b(cost|spend|spent|budget)\b/i;
const COST_EXCLUDE = /\bper\b/i; // "Cost per X" is an efficiency ratio, not total spend

// "Revenue" rarely appears literally — most ad platforms expose it as some
// flavor of "purchase(s) … value" instead (word order/qualifiers vary a
// lot: "Purchase Conversion Value", "Purchases Conversion Value (Facebook
// Pixel)", etc.), so match the two words independently rather than
// requiring them adjacent. Excludes narrow/derived variants (offline,
// mobile-app-only, "shared items" catalog segments, cost-efficiency
// ratios) in favor of the broad, canonical total.
function looksLikeRevenue(name: string): boolean {
  return (
    /\brevenue\b/i.test(name) ||
    (/\bsales\b/i.test(name) && /\bvalue\b/i.test(name)) ||
    (/\bpurchases?\b/i.test(name) && /\bvalue\b/i.test(name))
  );
}
const REVENUE_NARROW = /\b(per|rate|roas|offline|mobile|shared|catalog|segment|estimated)\b/i;

/** Picks the broadest/most canonical field matching, preferring the
 * shortest name among non-narrow candidates (verified against real data:
 * this correctly prefers Meta's "Purchases Conversion Value" over the
 * narrower "Offline Purchases Value"). */
function pickField(fields: RnField[], isMatch: (name: string) => boolean, narrow: RegExp): RnField | undefined {
  const candidates = fields.filter((f) => isMatch(f.field_name) && !narrow.test(f.field_name));
  if (candidates.length === 0) return undefined;
  return candidates.slice().sort((a, b) => a.field_name.length - b.field_name.length)[0];
}

export interface CurrencyTotal {
  currency: string;
  cost: number;
  revenue: number;
}

export interface IntegrationFinancials {
  integrationId: string;
  name: string;
  byCurrency: CurrencyTotal[];
  hasCost: boolean;
  hasRevenue: boolean;
}

/**
 * Sums cost/revenue for one integration across every one of its connected
 * accounts, over the given date range. Grouped by currency rather than
 * blended into one number — accounts under the very same integration can
 * (and, on this tenant's real data, do) run in different currencies, so
 * adding them together directly would silently produce a meaningless total.
 */
async function getIntegrationFinancials(
  integrationId: string,
  name: string,
  dateRange: Record<string, unknown>
): Promise<IntegrationFinancials> {
  const empty: IntegrationFinancials = { integrationId, name, byCurrency: [], hasCost: false, hasRevenue: false };

  const [detail, connections] = await Promise.all([
    getIntegrationDetail(integrationId).catch(() => undefined),
    listConnections(integrationId).catch(() => []),
  ]);
  if (!detail) return empty;

  const accounts = connections.flatMap((c) =>
    c.accounts.map((a) => ({ ...a, connection_key: c.connection_key }))
  );
  if (accounts.length === 0) return empty;

  const dataViews = detail.data_views;
  const dataView = dataViews?.length
    ? (dataViews.find((dv) => /^account$/i.test(dv.name)) ?? dataViews[0]).id
    : undefined;

  const fieldsData = await listFields(integrationId, dataView).catch(() => undefined);
  if (!fieldsData) return empty;

  const metricFields = fieldsData.fields.filter((f) => f.dim_met === "metric");
  const costField = pickField(metricFields, (name) => COST_PATTERN.test(name), COST_EXCLUDE);
  const revenueField = pickField(metricFields, looksLikeRevenue, REVENUE_NARROW);
  if (!costField && !revenueField) return empty;

  const dimensionField = pickTimeDimension(fieldsData.fields, fieldsData.default_dimension ?? "day");
  const settings = detail.settings?.length
    ? Object.fromEntries(detail.settings.map((s) => [s.id, s.recommended_value]))
    : undefined;
  const fields = [costField?.field_id, revenueField?.field_id].filter((f): f is string => !!f);

  const totalsByCurrency = new Map<string, { cost: number; revenue: number }>();

  await Promise.all(
    accounts.map(async (acct) => {
      const currency = acct.currency ?? "—";
      const runFor = (queryFields: string[]) =>
        runQuery<Record<string, string | number>>({
          integration_id: integrationId,
          connection_key: acct.connection_key,
          account_id: acct.account_id,
          ...(dataView ? { data_view: dataView } : {}),
          ...(settings ? { settings } : {}),
          fields: [dimensionField, ...queryFields],
          date_range: dateRange,
          limit: 500,
        });

      let rows: Record<string, string | number>[] = [];
      try {
        rows = await runFor(fields);
      } catch {
        // The combined request was rejected (field incompatibility, a
        // known real thing with some providers) — retry each field alone
        // rather than losing this account's numbers entirely.
        const settled = await Promise.allSettled(fields.map((f) => runFor([f])));
        rows = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      }

      const entry = totalsByCurrency.get(currency) ?? { cost: 0, revenue: 0 };
      for (const row of rows) {
        if (costField) entry.cost += Number(row[costField.field_id]) || 0;
        if (revenueField) entry.revenue += Number(row[revenueField.field_id]) || 0;
      }
      totalsByCurrency.set(currency, entry);
    })
  );

  return {
    integrationId,
    name,
    byCurrency: Array.from(totalsByCurrency.entries()).map(([currency, t]) => ({ currency, ...t })),
    hasCost: !!costField,
    hasRevenue: !!revenueField,
  };
}

export interface DashboardFinancials {
  perIntegration: IntegrationFinancials[];
  grandTotal: CurrencyTotal[];
}

/** Runs the per-integration financials for every connected integration in
 * parallel and rolls them up into a grand total, still grouped by currency. */
export async function getDashboardFinancials(
  connectedIntegrations: { id: string; name: string }[],
  dateRange: Record<string, unknown>
): Promise<DashboardFinancials> {
  const perIntegration = await Promise.all(
    connectedIntegrations.map((i) => getIntegrationFinancials(i.id, i.name, dateRange))
  );

  const grand = new Map<string, { cost: number; revenue: number }>();
  for (const result of perIntegration) {
    for (const t of result.byCurrency) {
      const entry = grand.get(t.currency) ?? { cost: 0, revenue: 0 };
      entry.cost += t.cost;
      entry.revenue += t.revenue;
      grand.set(t.currency, entry);
    }
  }

  return {
    perIntegration: perIntegration.filter((r) => r.hasCost || r.hasRevenue),
    grandTotal: Array.from(grand.entries())
      .map(([currency, t]) => ({ currency, ...t }))
      .sort((a, b) => b.cost + b.revenue - (a.cost + a.revenue)),
  };
}
