import { api } from "./api";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  createdAt: string;
}

export async function listTenants() {
  const { data } = await api.get<{ tenants: Tenant[] }>("/tenants");
  return data.tenants;
}

/** The currently-scoped tenant — a tenant user's own tenant, or whichever
 * tenant an agency user is browsing via "View as". */
export async function getMyTenant() {
  const { data } = await api.get<{ tenant: Tenant }>("/tenants/me");
  return data.tenant;
}
