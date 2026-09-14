// Shared types between @najd/api and @najd/web.
// Kept dependency-free (no Prisma import) so the web app can consume it
// without pulling in server-only packages.

export type Role = "SUPER_ADMIN" | "AGENCY_OWNER" | "AGENCY_STAFF" | "TENANT_OWNER" | "TENANT_MEMBER";

export type Locale = "en" | "ar";

export interface AgencySummary {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
}

export interface TenantSummary {
  id: string;
  agencyId: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
}

export interface AuthContext {
  userId: string;
  agencyId: string;
  tenantId: string | null;
  role: Role;
}
