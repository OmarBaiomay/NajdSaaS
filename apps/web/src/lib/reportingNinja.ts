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

export interface RnField {
  field_id: string;
  field_name: string;
  field_description?: string;
  field_type: string;
  dim_met: "dimension" | "metric";
}
export async function listFields(integrationId: string, connectionKey?: string, accountId?: string) {
  const { data } = await api.post<{ data: { fields: RnField[]; default_dimension?: string; default_metric?: string } }>(
    `${BASE}/fields`,
    { integration_id: integrationId, connection_key: connectionKey, account_id: accountId }
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
  limit?: number;
}
export async function runQuery<TRow = Record<string, unknown>>(input: RunQueryInput) {
  const { data } = await api.post<{ data: { rows: TRow[] } }>(`${BASE}/query`, input);
  return data.data.rows;
}
