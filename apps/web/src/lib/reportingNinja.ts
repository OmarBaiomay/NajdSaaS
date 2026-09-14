import { api } from "./api";

export type IntegrationStatus = "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "INVALID";

export interface IntegrationState {
  status: IntegrationStatus;
  keyPreview: string | null;
  lastTestedAt: string | null;
  lastError: string | null;
}

const BASE = "/integrations/reporting-ninja";

export async function getIntegrationStatus() {
  const { data } = await api.get<{ integration: IntegrationState }>(`${BASE}/status`);
  return data.integration;
}

export async function saveApiKey(apiKey: string) {
  const { data } = await api.post<{ integration: IntegrationState }>(`${BASE}/key`, { apiKey });
  return data.integration;
}

export async function testApiKey() {
  const { data } = await api.post<{ integration: IntegrationState }>(`${BASE}/test`);
  return data.integration;
}

export async function disconnectApiKey() {
  await api.delete(`${BASE}/key`);
}

export interface RnIntegrationSummary {
  id: string;
  name: string;
}
export async function listIntegrations() {
  const { data } = await api.post<{ data: { integrations: RnIntegrationSummary[] } }>(`${BASE}/integrations`);
  return data.data.integrations;
}

export interface RnDataView {
  id: string;
  name: string;
}
export interface RnIntegrationSetting {
  id: string;
  name: string;
  recommended_value: string;
  options?: { value: string; label: string }[];
}
export interface RnIntegrationDetail {
  id: string;
  name: string;
  supports_custom_fields_per_account: boolean;
  data_views: RnDataView[] | null;
  settings: RnIntegrationSetting[] | null;
}
export async function getIntegrationDetail(integrationId: string) {
  const { data } = await api.post<{ data: { integrations: RnIntegrationDetail[] } }>(`${BASE}/integrations/detail`, {
    integration_id: integrationId,
  });
  return data.data.integrations[0];
}

export interface RnAccount {
  account_id: string;
  account_name: string;
  currency?: string;
}
export interface RnConnection {
  connection_key: string;
  connection_name: string;
  status: string;
  accounts: RnAccount[];
}
export async function listConnections(integrationId: string) {
  const { data } = await api.post<{ data: { connections: RnConnection[] } }>(`${BASE}/connections`, {
    integration_id: integrationId,
  });
  return data.data.connections;
}

export interface IntegrationWithAccountCount extends RnIntegrationSummary {
  accountCount: number;
}

/**
 * Checking "does this integration have any connected accounts" means one
 * /connections call per integration in the catalog (~25 requests) — expensive
 * enough that every page needing it (dashboard, accounts overview) MUST
 * share one cached result via this single function + a shared query key,
 * or navigating between them repeatedly burns through the rate limit and
 * everything falsely reports "no accounts".
 */
export async function listIntegrationsWithAccountCounts(): Promise<IntegrationWithAccountCount[]> {
  const integrations = await listIntegrations();
  const settled = await Promise.allSettled(integrations.map((i) => listConnections(i.id)));
  return integrations.map((integration, i) => {
    const result = settled[i];
    const connections = result.status === "fulfilled" ? result.value : [];
    const accountCount = connections.reduce((sum, c) => sum + c.accounts.length, 0);
    return { ...integration, accountCount };
  });
}

export const INTEGRATIONS_WITH_COUNTS_QUERY_KEY = ["rn-integrations-with-account-counts"] as const;

export interface RnField {
  field_id: string;
  field_name: string;
  field_description?: string;
  field_type: string;
  dim_met: "dimension" | "metric";
}
/**
 * Fetches the standard field catalog for an integration. Reporting Ninja
 * rejects connection_key/account_id here unless include_custom_fields=true
 * *and* the integration supports per-account custom fields — so by default
 * we only ever send integration_id (+ data_view when the integration has
 * data views, e.g. google_ads, microsoft_ads, youtube).
 */
export async function listFields(integrationId: string, dataView?: string) {
  const { data } = await api.post<{ data: { fields: RnField[]; default_dimension?: string; default_metric?: string } }>(
    `${BASE}/fields`,
    { integration_id: integrationId, ...(dataView ? { data_view: dataView } : {}) }
  );
  return data.data;
}

export interface RunQueryInput {
  integration_id: string;
  connection_key: string;
  account_id: string;
  data_view?: string;
  fields: string[];
  date_range: Record<string, unknown>;
  compare_to?: Record<string, unknown>;
  filters?: Record<string, unknown>[];
  settings?: Record<string, unknown>;
  limit?: number;
}
export async function runQuery<TRow = Record<string, unknown>>(input: RunQueryInput) {
  const { data } = await api.post<{ data: { rows: TRow[] } }>(`${BASE}/query`, input);
  return data.data.rows;
}
