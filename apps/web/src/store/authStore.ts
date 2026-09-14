import { create } from "zustand";

export type Role = "SUPER_ADMIN" | "AGENCY_OWNER" | "AGENCY_STAFF" | "TENANT_OWNER" | "TENANT_MEMBER";

export interface AuthUser {
  userId: string;
  agencyId: string;
  tenantId: string | null;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthState["status"]) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  setUser: (user) => set({ user, status: user ? "authenticated" : "unauthenticated" }),
  setStatus: (status) => set({ status }),
}));

export const isAgencyLevel = (role?: Role) =>
  role === "SUPER_ADMIN" || role === "AGENCY_OWNER" || role === "AGENCY_STAFF";

export const isTenantLevel = (role?: Role) => role === "TENANT_OWNER" || role === "TENANT_MEMBER";
