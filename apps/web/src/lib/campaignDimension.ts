import type { RnField } from "./reportingNinja";

/**
 * Picks the best "campaign" dimension field to break the Campaigns table
 * down by — most ad platforms expose one (facebook_ads "Campaign Name",
 * google_ads "Campaign", etc.), preferring an explicit name field over a
 * bare ID (a table of raw campaign IDs isn't useful) when both exist.
 * Integrations with no campaign concept (e.g. a pure analytics source)
 * simply return undefined and the table is skipped.
 */
export function pickCampaignDimension(fields: RnField[]): RnField | undefined {
  const dimensions = fields.filter((f) => f.dim_met === "dimension");
  const campaignFields = dimensions.filter(
    (f) => /campaign/i.test(f.field_id) || /campaign/i.test(f.field_name)
  );
  if (campaignFields.length === 0) return undefined;

  const named = campaignFields.find((f) => /name/i.test(f.field_id) || /name/i.test(f.field_name));
  if (named) return named;

  const idLike = new Set(
    campaignFields.filter((f) => /\bid\b/i.test(f.field_id) || /\bid\b/i.test(f.field_name))
  );
  const nonId = campaignFields.filter((f) => !idLike.has(f));
  return nonId[0] ?? campaignFields[0];
}
