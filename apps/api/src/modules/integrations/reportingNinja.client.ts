import axios, { isAxiosError } from "axios";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Thin client for the Reporting Ninja public API (api.reportingninja.com/v1).
 * All endpoints are POST + Bearer auth and return a JSON envelope:
 *   { status: "ok", data, meta } | { status: "error", error_code, message, meta }
 * Most business errors come back as HTTP 200 with status="error" — only
 * auth (401) and rate limiting (429) use non-200 status codes.
 * https://api.reportingninja.com/v1 — see OpenAPI spec for full contract.
 */

interface RnOkEnvelope<T> {
  status: "ok";
  data: T;
  meta: Record<string, unknown>;
}
interface RnErrorEnvelope {
  status: "error";
  error_code: string;
  message: string;
  meta: Record<string, unknown>;
}
type RnEnvelope<T> = RnOkEnvelope<T> | RnErrorEnvelope;

export class ReportingNinjaError extends Error {
  errorCode: string;
  httpStatus: number;

  constructor(errorCode: string, message: string, httpStatus: number) {
    super(message);
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
  }
}

const http = axios.create({ baseURL: env.REPORTING_NINJA_BASE_URL, timeout: 20_000 });

async function requestEnvelope<T>(
  apiKey: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<RnOkEnvelope<T>> {
  try {
    const { data } = await http.post<RnEnvelope<T>>(endpoint, body, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (data.status === "error") {
      throw new ReportingNinjaError(data.error_code, data.message, 200);
    }
    return data;
  } catch (err) {
    if (err instanceof ReportingNinjaError) throw err;

    if (isAxiosError(err)) {
      const status = err.response?.status;
      const envelope = err.response?.data as RnErrorEnvelope | undefined;

      if (status === 401) {
        throw new ReportingNinjaError(envelope?.error_code ?? "AUTH_INVALID", "Invalid or expired API key", 401);
      }
      if (status === 429) {
        throw new ReportingNinjaError(
          envelope?.error_code ?? "RATE_LIMITED",
          "Reporting Ninja rate limit exceeded — try again shortly",
          429
        );
      }
      if (envelope?.error_code) {
        throw new ReportingNinjaError(envelope.error_code, envelope.message, status ?? 502);
      }
      throw ApiError.badRequest("Reporting Ninja API request failed", "REPORTING_NINJA_UNREACHABLE");
    }
    throw err;
  }
}

export async function reportingNinjaRequest<T>(
  apiKey: string,
  endpoint: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const envelope = await requestEnvelope<T>(apiKey, endpoint, body);
  return envelope.data;
}

/** Same as reportingNinjaRequest but also returns the response envelope's
 * `meta` — used only by /query, where meta carries cursor pagination info
 * (total_rows/has_more/next_cursor). A single call caps at 1000 rows
 * (confirmed live: a real account's search-term report alone had 4,659
 * rows), so anything that might legitimately exceed that needs the cursor
 * to fetch the rest instead of silently truncating. */
export async function reportingNinjaRequestWithMeta<T>(
  apiKey: string,
  endpoint: string,
  body: Record<string, unknown> = {}
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const envelope = await requestEnvelope<T>(apiKey, endpoint, body);
  return { data: envelope.data, meta: envelope.meta };
}
