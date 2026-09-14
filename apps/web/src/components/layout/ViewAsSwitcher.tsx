import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Building2, Users } from "lucide-react";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { listTenants } from "@/lib/tenants";
import { useViewAsStore } from "@/store/viewAsStore";

const AGENCY_VALUE = "__agency__";

/** Pinned at the top of the agency sidebar: switch between the agency's own
 * view and any one tenant's data, using the agency's cross-tenant access. */
export function ViewAsSwitcher() {
  const { t } = useTranslation();
  const { tenantId, setViewAs } = useViewAsStore();

  const { data: tenants } = useQuery({ queryKey: ["tenants"], queryFn: listTenants });

  const options: SearchableOption[] = [
    { value: AGENCY_VALUE, label: t("viewAs.agency"), icon: <Building2 size={16} /> },
    ...(tenants?.map((tenant) => ({
      value: tenant.id,
      label: tenant.name,
      description: tenant.slug,
      icon: <Users size={16} />,
    })) ?? []),
  ];

  return (
    <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t("viewAs.label")}</p>
      <SearchableSelect
        value={tenantId ?? AGENCY_VALUE}
        onChange={(value) => {
          if (value === AGENCY_VALUE) {
            setViewAs(null, null);
          } else {
            const tenant = tenants?.find((t) => t.id === value);
            setViewAs(value, tenant?.name ?? null);
          }
        }}
        options={options}
      />
    </div>
  );
}
