import { PrismaClient } from "@prisma/client";
import { isProd } from "./env.js";

export const prisma = new PrismaClient({
  log: isProd ? ["error", "warn"] : ["error", "warn"],
});

/**
 * Runs `fn` on a transaction with Postgres session variables set so that
 * Row-Level Security policies (see prisma/sql/rls.sql) scope every query
 * to the current agency/tenant — a defense-in-depth backstop behind the
 * app-level tenant middleware. SUPER_ADMIN requests pass agencyId=null to
 * bypass RLS entirely.
 */
export async function withTenantContext<T>(
  ctx: { agencyId: string | null; tenantId?: string | null },
  fn: (tx: Omit<PrismaClient, "$transaction" | "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (ctx.agencyId) {
      await tx.$executeRaw`select set_config('app.bypass_rls', 'off', true)`;
      await tx.$executeRaw`select set_config('app.current_agency_id', ${ctx.agencyId}, true)`;
      if (ctx.tenantId) {
        await tx.$executeRaw`select set_config('app.current_tenant_id', ${ctx.tenantId}, true)`;
      }
    } else {
      // SUPER_ADMIN / platform-level operation
      await tx.$executeRaw`select set_config('app.bypass_rls', 'on', true)`;
    }
    return fn(tx);
  });
}
