import { api } from "./api";
import type { Role } from "@/store/authStore";

export type AssignableRole = Exclude<Role, "SUPER_ADMIN" | "AGENCY_OWNER">;

export interface AppUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  isActive: boolean;
  tenantId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export async function listUsers() {
  const { data } = await api.get<{ users: AppUser[] }>("/users");
  return data.users;
}

export async function getCreatableRoles() {
  const { data } = await api.get<{ roles: AssignableRole[] }>("/users/creatable-roles");
  return data.roles;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: AssignableRole;
  tenantId?: string;
}
export async function createUser(input: CreateUserInput) {
  const { data } = await api.post<{ user: AppUser }>("/users", input);
  return data.user;
}

export interface UpdateUserInput {
  isActive?: boolean;
  role?: AssignableRole;
  firstName?: string;
  lastName?: string;
}
export async function updateUser(userId: string, input: UpdateUserInput) {
  const { data } = await api.patch<{ user: AppUser }>(`/users/${userId}`, input);
  return data.user;
}
