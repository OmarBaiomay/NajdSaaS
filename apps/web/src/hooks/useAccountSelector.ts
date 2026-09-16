import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listConnections } from "@/lib/reportingNinja";
import type { SearchableOption } from "@/components/ui/SearchableSelect";
import { getDefaultAccount, setDefaultAccount } from "@/lib/defaultAccounts";
import { useAuthStore } from "@/store/authStore";
import { useViewAsStore } from "@/store/viewAsStore";

/**
 * The connection/account picking logic shared by every per-integration
 * page (generic or hand-built): fetch connections, build searchable
 * options, and auto-select the account remembered from last time — scoped
 * per tenant so an agency user browsing different tenants via "View as"
 * never leaks one tenant's default account into another's. Extracted out
 * of IntegrationDetail.tsx so custom integration pages (Google Analytics
 * and whatever comes after it) don't have to reimplement it.
 */
export function useAccountSelector(integrationId: string) {
  const [connectionKey, setConnectionKey] = useState("");
  const [accountId, setAccountId] = useState("");

  const authTenantId = useAuthStore((s) => s.user?.tenantId);
  const viewAsTenantId = useViewAsStore((s) => s.tenantId);
  const accountScope = viewAsTenantId ?? authTenantId ?? "self";

  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["rn-connections", integrationId],
    queryFn: () => listConnections(integrationId),
  });

  const accountOptions: SearchableOption[] =
    connections?.flatMap((c) =>
      c.accounts.map((a) => ({
        value: `${c.connection_key}::${a.account_id}`,
        label: a.account_name,
        description: c.connection_name !== a.account_name ? c.connection_name : undefined,
      }))
    ) ?? [];

  const selectAccount = (value: string, remember = true) => {
    const [ck, aid] = value.split("::");
    setConnectionKey(ck ?? "");
    setAccountId(aid ?? "");
    if (remember && ck && aid) setDefaultAccount(accountScope, integrationId, value);
  };

  useEffect(() => {
    if (accountId || accountOptions.length === 0) return;
    const saved = getDefaultAccount(accountScope, integrationId);
    const fallback = saved && accountOptions.some((o) => o.value === saved) ? saved : accountOptions[0].value;
    selectAccount(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountOptions, accountScope, integrationId]);

  const selectedCurrency = connections?.flatMap((c) => c.accounts).find((a) => a.account_id === accountId)?.currency;

  return {
    connectionKey,
    accountId,
    accountOptions,
    connectionsLoading,
    connections,
    selectAccount,
    selectedCurrency,
  };
}
