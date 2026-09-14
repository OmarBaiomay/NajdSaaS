import type { RnField } from "./reportingNinja";

/**
 * Reporting Ninja's `default_dimension` is often NOT a time dimension (e.g.
 * facebook_ads defaults to "account_name", google_ads to "campaign.name") —
 * using it to drive a "last 30 days" trend chart collapses everything into
 * a single point. Pick the field actually typed as a date instead, favoring
 * a daily grain over a weekly/monthly one when more than one is offered.
 */
export function pickTimeDimension(fields: RnField[], fallback: string): string {
  const dateFields = fields.filter((f) => f.dim_met === "dimension" && f.field_type === "date");
  if (dateFields.length === 0) return fallback;

  const daily = dateFields.find((f) => /day/i.test(f.field_id) || /day/i.test(f.field_name));
  return (daily ?? dateFields[0]).field_id;
}
