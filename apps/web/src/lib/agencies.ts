import { api } from "./api";

export interface AgencySummary {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
  locale: string;
  createdAt: string;
  _count: { tenants: number; users: number };
}

export async function getMyAgency() {
  const { data } = await api.get<{ agency: AgencySummary }>("/agencies/me");
  return data.agency;
}
