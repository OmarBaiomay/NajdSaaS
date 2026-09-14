const PREFIX = "najd:default-account";

function key(scope: string, integrationId: string) {
  return `${PREFIX}:${scope}:${integrationId}`;
}

/** Remembers the last account picked for an integration, scoped per
 * tenant (so an agency user browsing different tenants via "View as"
 * doesn't leak one tenant's default into another's). Used to auto-select
 * that account next time the integration's page is opened. */
export function getDefaultAccount(scope: string, integrationId: string): string | null {
  try {
    return localStorage.getItem(key(scope, integrationId));
  } catch {
    return null;
  }
}

export function setDefaultAccount(scope: string, integrationId: string, value: string) {
  try {
    localStorage.setItem(key(scope, integrationId), value);
  } catch {
    /* private mode / storage disabled — just won't be remembered */
  }
}
