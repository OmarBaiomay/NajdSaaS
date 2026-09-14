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
