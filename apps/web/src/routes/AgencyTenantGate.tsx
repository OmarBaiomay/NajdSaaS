import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useViewAsStore } from "@/store/viewAsStore";

/** Guards agency routes that require a tenant to be selected via "View as". */
export function AgencyTenantGate() {
  const { t } = useTranslation();
  const tenantId = useViewAsStore((s) => s.tenantId);

  if (!tenantId) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <Building2 size={28} className="text-slate-300" />
        <p className="text-sm text-slate-500">{t("viewAs.selectTenantFirst")}</p>
      </Card>
    );
  }

  return <Outlet />;
}
