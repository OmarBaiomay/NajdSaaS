import type { ComponentType } from "react";
import GoogleAnalyticsDetail from "./GoogleAnalyticsDetail";

/**
 * Hand-built pages that replace the generic auto-layout for a specific
 * integration, keyed by Reporting Ninja integration id — the user is
 * sending a reference (their existing Looker Studio report) for one
 * integration at a time and wants that exact layout, not the generic
 * "pick 5 hero metrics + everything else" page every other integration
 * still gets. Falls back to the generic IntegrationDetail page for any
 * integration id not listed here.
 */
export const CUSTOM_INTEGRATION_PAGES: Record<string, ComponentType> = {
  ga4: GoogleAnalyticsDetail,
};
