import { prisma } from "../../config/db.js";
import { encryptSecret, decryptSecret, maskSecret } from "../../utils/crypto.js";
import { reportingNinjaRequest, reportingNinjaRequestWithMeta, ReportingNinjaError } from "./reportingNinja.client.js";
import { ApiError } from "../../utils/ApiError.js";

const PROVIDER = "REPORTING_NINJA" as const;

async function getCredentialOrThrow(agencyId: string, tenantId: string) {
  const credential = await prisma.integrationCredential.findFirst({
    where: { agencyId, tenantId, provider: PROVIDER },
  });
  if (!credential) {
    throw ApiError.notFound("No Reporting Ninja API key connected for this tenant", "NOT_CONNECTED");
  }
  return credential;
}

export async function getStatus(agencyId: string, tenantId: string) {
  const credential = await prisma.integrationCredential.findFirst({
    where: { agencyId, tenantId, provider: PROVIDER },
    select: { status: true, keyPreview: true, lastTestedAt: true, lastError: true, updatedAt: true },
  });
  return credential ?? { status: "NOT_CONNECTED" as const, keyPreview: null, lastTestedAt: null, lastError: null };
}

/** Saves (or replaces) the tenant's key and immediately tests it against Reporting Ninja. */
export async function saveAndTestKey(
  agencyId: string,
  tenantId: string,
  userId: string,
  apiKey: string
) {
  const trimmed = apiKey.trim();
  if (!trimmed) throw ApiError.badRequest("API key is required");

  const { encryptedKey, iv, authTag } = encryptSecret(trimmed);
  const keyPreview = maskSecret(trimmed);

  const credential = await prisma.integrationCredential.upsert({
    where: { tenantId_provider: { tenantId, provider: PROVIDER } },
    create: {
      agencyId,
      tenantId,
      provider: PROVIDER,
      encryptedKey,
      iv,
      authTag,
      keyPreview,
      createdById: userId,
      status: "PENDING",
    },
    update: { encryptedKey, iv, authTag, keyPreview, status: "PENDING", lastError: null },
  });

  return testConnection(agencyId, tenantId, credential.id);
}

export async function testConnection(agencyId: string, tenantId: string, credentialId?: string) {
  const credential = credentialId
    ? await prisma.integrationCredential.findUniqueOrThrow({ where: { id: credentialId } })
    : await getCredentialOrThrow(agencyId, tenantId);

  const apiKey = decryptSecret(credential);

  try {
    // /integrations requires only a valid bearer token — the cheapest true connectivity check.
    await reportingNinjaRequest(apiKey, "/integrations");
    return prisma.integrationCredential.update({
      where: { id: credential.id },
      data: { status: "CONNECTED", lastTestedAt: new Date(), lastError: null },
      select: { status: true, keyPreview: true, lastTestedAt: true, lastError: true },
    });
  } catch (err) {
    const message = err instanceof ReportingNinjaError ? err.message : "Connection test failed";
    await prisma.integrationCredential.update({
      where: { id: credential.id },
      data: { status: "INVALID", lastTestedAt: new Date(), lastError: message },
    });
    throw ApiError.badRequest(message, err instanceof ReportingNinjaError ? err.errorCode : "TEST_FAILED");
  }
}

export async function disconnect(agencyId: string, tenantId: string) {
  await prisma.integrationCredential.deleteMany({ where: { agencyId, tenantId, provider: PROVIDER } });
}

/** Generic authenticated proxy: resolves the tenant's key, forwards body to any Reporting Ninja endpoint. */
export async function proxyRequest<T>(
  agencyId: string,
  tenantId: string,
  endpoint: "/integrations" | "/integrations/detail" | "/connections" | "/fields" | "/query",
  body: Record<string, unknown>
): Promise<T> {
  const credential = await getCredentialOrThrow(agencyId, tenantId);
  if (credential.status === "INVALID") {
    throw ApiError.badRequest("Reporting Ninja key is invalid — reconnect it in Settings", "NOT_CONNECTED");
  }
  const apiKey = decryptSecret(credential);
  return reportingNinjaRequest<T>(apiKey, endpoint, body);
}

/** Same as proxyRequest but also returns Reporting Ninja's response `meta`
 * — used only for /query, so callers can page past its 1000-row cap via
 * meta.next_cursor instead of silently truncating a large result set. */
export async function proxyRequestWithMeta<T>(
  agencyId: string,
  tenantId: string,
  endpoint: "/query",
  body: Record<string, unknown>
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const credential = await getCredentialOrThrow(agencyId, tenantId);
  if (credential.status === "INVALID") {
    throw ApiError.badRequest("Reporting Ninja key is invalid — reconnect it in Settings", "NOT_CONNECTED");
  }
  const apiKey = decryptSecret(credential);
  return reportingNinjaRequestWithMeta<T>(apiKey, endpoint, body);
}
