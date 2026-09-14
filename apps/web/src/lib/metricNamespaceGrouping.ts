import type { RnField } from "./reportingNinja";

export interface NamespaceGroup {
  key: string;
  label: string;
  members: RnField[];
}

function humanize(text: string): string {
  return text
    .replace(/[_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Many integrations (Facebook Ads especially) namespace related metrics as
 * "<family>:<sub-type>" — e.g. actions:link_click, actions:purchase,
 * actions:lead all sit under the "actions" family. Individually these are
 * dozens of near-meaningless flat cards; grouped by family and ranked, they
 * become a genuinely useful "what's actually happening" breakdown (top
 * actions by count, by value, by cost-efficiency…).
 */
export function groupMetricsByNamespace(
  fields: RnField[],
  opts?: { minMembers?: number; maxGroups?: number }
): NamespaceGroup[] {
  const minMembers = opts?.minMembers ?? 3;
  const maxGroups = opts?.maxGroups ?? 4;

  const byPrefix = new Map<string, RnField[]>();
  for (const field of fields) {
    const idx = field.field_id.indexOf(":");
    if (idx === -1) continue;
    const prefix = field.field_id.slice(0, idx);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix)!.push(field);
  }

  const groups: NamespaceGroup[] = [];
  for (const [prefix, members] of byPrefix) {
    if (members.length < minMembers) continue;
    groups.push({ key: prefix, label: humanize(prefix), members });
  }

  return groups.sort((a, b) => b.members.length - a.members.length).slice(0, maxGroups);
}
