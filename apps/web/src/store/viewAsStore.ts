import { create } from "zustand";

/**
 * Lets an agency-level user (SUPER_ADMIN/AGENCY_OWNER/AGENCY_STAFF) browse a
 * specific tenant's data — "View as". When a tenant is selected, every API
 * request carries x-tenant-id (see lib/api.ts), which the backend's
 * resolveTenantScope middleware already honors for agency-level roles.
 * Tenant-level users never touch this store (it stays null for them).
 */
interface ViewAsState {
  tenantId: string | null;
  tenantName: string | null;
  setViewAs: (tenantId: string | null, tenantName?: string | null) => void;
}

export const useViewAsStore = create<ViewAsState>((set) => ({
  tenantId: null,
  tenantName: null,
  setViewAs: (tenantId, tenantName = null) => set({ tenantId, tenantName }),
}));
