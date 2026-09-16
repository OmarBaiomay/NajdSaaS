import { isAxiosError } from "axios";

/** Pulls Reporting Ninja's own error message out of a failed request, so a
 * real reason ("connection auth expired", "field X not available"…) shows
 * up instead of a generic "failed to load" — used by every integration
 * page, generic or hand-built. */
export function extractApiErrorMessage(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined;
  return (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
}
