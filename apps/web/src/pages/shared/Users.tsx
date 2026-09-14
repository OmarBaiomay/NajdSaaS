import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { UserPlus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { listUsers, createUser, updateUser, getCreatableRoles, type AssignableRole } from "@/lib/users";
import { listTenants } from "@/lib/tenants";
import { useAuthStore, isAgencyLevel, type Role } from "@/store/authStore";

const ROLE_BADGE: Record<Role, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  AGENCY_OWNER: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  AGENCY_STAFF: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  TENANT_OWNER: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  TENANT_MEMBER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const EMPTY_FORM = { firstName: "", lastName: "", email: "", password: "", role: "" as AssignableRole | "", tenantId: "" };

export default function Users() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const authRole = useAuthStore((s) => s.user?.role);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const { data: creatableRoles } = useQuery({ queryKey: ["users-creatable-roles"], queryFn: getCreatableRoles });
  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: listTenants,
    enabled: isAgencyLevel(authRole),
  });
  const tenantName = (tenantId: string | null) => tenants?.find((t) => t.id === tenantId)?.name ?? null;

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError(null);
      invalidateUsers();
    },
    onError: (err) => {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      setFormError(message ?? t("users.createFailed"));
    },
  });

  const updateMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateUser>[1] }) => updateUser(id, input), onSuccess: invalidateUsers });

  const canManage = (creatableRoles?.length ?? 0) > 0;
  const roleOptions: SearchableOption[] = (creatableRoles ?? []).map((r) => ({ value: r, label: t(`users.role.${r}`) }));
  const tenantOptions: SearchableOption[] = (tenants ?? []).map((tn) => ({ value: tn.id, label: tn.name }));
  const needsTenant = (form.role === "TENANT_OWNER" || form.role === "TENANT_MEMBER") && isAgencyLevel(authRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) return;
    createMutation.mutate({
      email: form.email,
      password: form.password,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      role: form.role,
      tenantId: needsTenant ? form.tenantId || undefined : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={16} /> : <UserPlus size={16} />}
            {showForm ? t("common.cancel") : t("users.addUser")}
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.firstName")}</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("users.lastName")}</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.email")}</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.password")}</label>
              <PasswordInput
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <SearchableSelect
              label={t("users.role.label")}
              placeholder={t("common.select")}
              value={form.role}
              onChange={(v) => setForm((f) => ({ ...f, role: v as AssignableRole, tenantId: "" }))}
              options={roleOptions}
            />
            {needsTenant && (
              <SearchableSelect
                label={t("nav.tenants")}
                placeholder={t("common.select")}
                value={form.tenantId}
                onChange={(v) => setForm((f) => ({ ...f, tenantId: v }))}
                options={tenantOptions}
              />
            )}

            <div className="sm:col-span-2">
              {formError && <p className="mb-2 text-sm text-red-500">{formError}</p>}
              <Button type="submit" disabled={createMutation.isPending || !form.role || (needsTenant && !form.tenantId)}>
                {createMutation.isPending ? t("users.creating") : t("users.createUser")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden !p-0">
        {isLoading && <p className="p-5 text-sm text-slate-400">{t("common.loading")}</p>}
        {!isLoading && users?.length === 0 && <p className="p-5 text-sm text-slate-500">{t("users.noUsers")}</p>}

        {!isLoading && (users?.length ?? 0) > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {users!.map((u) => {
              const isSelf = u.id === currentUserId;
              const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
              const canEditRole = canManage && u.role !== "AGENCY_OWNER" && u.role !== "SUPER_ADMIN";
              return (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {displayName} {isSelf && <span className="text-xs text-slate-400">({t("users.you")})</span>}
                    </p>
                    <p className="truncate text-sm text-slate-500">{u.email}</p>
                    {isAgencyLevel(authRole) && tenantName(u.tenantId) && (
                      <p className="text-xs text-slate-400">{tenantName(u.tenantId)}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEditRole ? (
                      <SearchableSelect
                        value={u.role}
                        onChange={(role) => updateMutation.mutate({ id: u.id, input: { role: role as AssignableRole } })}
                        options={[
                          { value: u.role, label: t(`users.role.${u.role}`) },
                          ...(creatableRoles ?? [])
                            .filter((r) => r !== u.role)
                            .map((r) => ({ value: r, label: t(`users.role.${r}`) })),
                        ]}
                        className="w-40"
                      />
                    ) : (
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                        {t(`users.role.${u.role}`)}
                      </span>
                    )}

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        u.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {u.isActive ? t("users.active") : t("users.inactive")}
                    </span>

                    {canManage && !isSelf && (
                      <Button
                        variant="ghost"
                        onClick={() => updateMutation.mutate({ id: u.id, input: { isActive: !u.isActive } })}
                        disabled={updateMutation.isPending}
                      >
                        {u.isActive ? t("users.deactivate") : t("users.activate")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
