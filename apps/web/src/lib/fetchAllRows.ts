import { runQueryPage, type RunQueryInput } from "./reportingNinja";

// One call caps at 1000 rows — 10 pages covers up to 10,000, comfortably
// past any real breakdown table seen so far (a real account's search-term
// report alone had 4,659 rows) while still bounding worst-case call count.
const MAX_PAGES = 10;

/**
 * Fetches every page of a /query result via cursor pagination instead of
 * silently truncating at Reporting Ninja's 1000-row per-call limit. Drop-in
 * replacement for `runQuery` wherever a breakdown could plausibly exceed
 * 1000 rows (search terms, keywords, campaigns on a large account…).
 */
export async function fetchAllRows<TRow = Record<string, unknown>>(
  input: Omit<RunQueryInput, "cursor">
): Promise<TRow[]> {
  let cursor: string | undefined;
  const rows: TRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await runQueryPage<TRow>({ ...input, cursor });
    rows.push(...result.rows);
    if (!result.meta.has_more || !result.meta.next_cursor) break;
    cursor = result.meta.next_cursor;
  }
  return rows;
}
