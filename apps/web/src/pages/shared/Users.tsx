import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getCreatableRoles,
  type AppUser,
  type AssignableRole,
} from "@/lib/users";
import { listTenants } from "@/lib/tenants";
import { useAuthStore, isAgencyLevel, type Role } from "@/store/authStore";

const ROLE_BADGE: Record<Role, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  AGENCY_OWNER: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  AGENCY_STAFF: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  TENANT_OWNER: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  TENANT_MEMBER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const EMPTY_CREATE_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "" as AssignableRole | "",
  tenantId: "",
};

export default function Users() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const authRole = useAuthStore((s) => s.user?.role);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "" as Role | "" });
  const [editError, setEditError] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const { data: creatableRoles } = useQuery({ queryKey: ["users-creatable-roles"], queryFn: getCreatableRoles });
  const { data: tenants } = useQuery({ queryKey: ["tenants"], queryFn: listTenants, enabled: isAgencyLevel(authRole) });
  const tenantName = (tenantId: string | null) => tenants?.find((tn) => tn.id === tenantId)?.name ?? null;

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateError(null);
      invalidateUsers();
    },
    onError: (err) => setCreateError(extractErrorMessage(err) ?? t("users.createFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateUser>[1] }) => updateUser(id, input),
    onSuccess: invalidateUsers,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateUser>[1] }) => updateUser(id, input),
    onSuccess: () => {
      setEditingUser(null);
      setEditError(null);
      invalidateUsers();
    },
    onError: (err) => setEditError(extractErrorMessage(err) ?? t("users.saveFailed")),
  });

  const deleteMutation = useMutation({ mutationFn: deleteUser, onSuccess: invalidateUsers });

  const canManage = (creatableRoles?.length ?? 0) > 0;
  const roleOptions: SearchableOption[] = (creatableRoles ?? []).map((r) => ({ value: r, label: t(`users.role.${r}`) }));
  const tenantOptions: SearchableOption[] = (tenants ?? []).map((tn) => ({ value: tn.id, label: tn.name }));
  const needsTenant = (createForm.role === "TENANT_OWNER" || createForm.role === "TENANT_MEMBER") && isAgencyLevel(authRole);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.role) return;
    createMutation.mutate({
      email: createForm.email,
      password: createForm.password,
      firstName: createForm.firstName || undefined,
      lastName: createForm.lastName || undefined,
      role: createForm.role,
      tenantId: needsTenant ? createForm.tenantId || undefined : undefined,
    });
  };

  const openEdit = (u: AppUser) => {
    setEditingUser(u);
    setEditForm({ firstName: u.firstName ?? "", lastName: u.lastName ?? "", email: u.email, password: "", role: u.role });
    setEditError(null);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const canEditRole = editingUser.role !== "AGENCY_OWNER" && editingUser.role !== "SUPER_ADMIN" && canManage;
    editMutation.mutate({
      id: editingUser.id,
      input: {
        firstName: editForm.firstName || undefined,
        lastName: editForm.lastName || undefined,
        email: editForm.email !== editingUser.email ? editForm.email : undefined,
        password: editForm.password || undefined,
        role: canEditRole && editForm.role !== editingUser.role ? (editForm.role as AssignableRole) : undefined,
      },
    });
  };

  const handleDelete = (u: AppUser) => {
    const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
    if (window.confirm(t("users.confirmDelete", { name: displayName }))) {
      deleteMutation.mutate(u.id);
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)}>
            <UserPlus size={16} />
            {t("users.addUser")}
          </Button>
        </div>
      )}

      {showCreate && (
        <Modal title={t("users.addUser")} onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.firstName")}</label>
              <input
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.lastName")}</label>
              <input
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("auth.email")}</label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("auth.password")}</label>
              <PasswordInput
                required
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <SearchableSelect
              label={t("users.role.label")}
              placeholder={t("common.select")}
              value={createForm.role}
              onChange={(v) => setCreateForm((f) => ({ ...f, role: v as AssignableRole, tenantId: "" }))}
              options={roleOptions}
            />
            {needsTenant && (
              <SearchableSelect
                label={t("nav.tenants")}
                placeholder={t("common.select")}
                value={createForm.tenantId}
                onChange={(v) => setCreateForm((f) => ({ ...f, tenantId: v }))}
                options={tenantOptions}
              />
            )}

            <div className="sm:col-span-2">
              {createError && <p className="mb-2 text-sm text-red-500">{createError}</p>}
              <Button
                type="submit"
                disabled={createMutation.isPending || !createForm.role || (needsTenant && !createForm.tenantId)}
              >
                {createMutation.isPending ? t("users.creating") : t("users.createUser")}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {editingUser && (
        <Modal title={t("users.editUser")} onClose={() => setEditingUser(null)}>
          <form onSubmit={handleEditSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.firstName")}</label>
              <input
                value={editForm.firstName}
                onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.lastName")}</label>
              <input
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("auth.email")}</label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("users.newPassword")}</label>
              <PasswordInput
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t("users.newPasswordHint")}
              />
            </div>
            {editingUser.role !== "AGENCY_OWNER" && editingUser.role !== "SUPER_ADMIN" && canManage && (
              <SearchableSelect
                label={t("users.role.label")}
                value={editForm.role}
                onChange={(v) => setEditForm((f) => ({ ...f, role: v as Role }))}
                options={[
                  { value: editingUser.role, label: t(`users.role.${editingUser.role}`) },
                  ...(creatableRoles ?? [])
                    .filter((r) => r !== editingUser.role)
                    .map((r) => ({ value: r, label: t(`users.role.${r}`) })),
                ]}
              />
            )}

            <div className="sm:col-span-2">
              {editError && <p className="mb-2 text-sm text-red-500">{editError}</p>}
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? "…" : t("common.save")}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <Card className="overflow-x-auto !p-0">
        {isLoading && <p className="p-5 text-sm text-slate-400">{t("common.loading")}</p>}
        {!isLoading && users?.length === 0 && <p className="p-5 text-sm text-slate-500">{t("users.noUsers")}</p>}

        {!isLoading && (users?.length ?? 0) > 0 && (
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 text-start font-medium">{t("users.columnName")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("users.role.label")}</th>
                {isAgencyLevel(authRole) && <th className="px-4 py-3 text-start font-medium">{t("nav.tenants")}</th>}
                <th className="px-4 py-3 text-start font-medium">{t("users.columnStatus")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("users.columnActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users!.map((u) => {
                const isSelf = u.id === currentUserId;
                const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
                const isProtected = u.role === "AGENCY_OWNER" || u.role === "SUPER_ADMIN";
                return (
                  <tr key={u.id}>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {displayName} {isSelf && <span className="text-xs text-slate-400">({t("users.you")})</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                        {t(`users.role.${u.role}`)}
                      </span>
                    </td>
                    {isAgencyLevel(authRole) && (
                      <td className="px-4 py-3 text-slate-500">{tenantName(u.tenantId) ?? "—"}</td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        disabled={!canManage || isSelf}
                        onClick={() => updateMutation.mutate({ id: u.id, input: { isActive: !u.isActive } })}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity ${
                          u.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        } ${canManage && !isSelf ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                      >
                        {u.isActive ? t("users.active") : t("users.inactive")}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                          aria-label={t("users.editUser")}
                        >
                          <Pencil size={15} />
                        </button>
                        {canManage && !isSelf && !isProtected && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            aria-label={t("users.deleteUser")}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function extractErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: { message?: string } } } } | undefined)?.response?.data?.error
    ?.message;
}
