import { z } from "zod";

export const saveKeySchema = z.object({
  apiKey: z.string().min(10, "That doesn't look like a valid API key").max(500),
});

// Passed straight through to Reporting Ninja's /query — validated loosely here;
// Reporting Ninja itself returns a typed INVALID_* error_code for anything malformed.
export const queryProxySchema = z.object({
  integration_id: z.string().min(1),
  connection_key: z.string().min(1),
  account_id: z.string().min(1),
  data_view: z.string().optional(),
  fields: z.array(z.string()).min(1),
  date_range: z.record(z.string(), z.unknown()),
  compare_to: z.record(z.string(), z.unknown()).optional(),
  comparison_type: z.string().optional(),
  filters: z.array(z.record(z.string(), z.unknown())).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  limit: z.number().int().positive().max(1000).optional(),
  cursor: z.string().optional(),
});

export const integrationDetailProxySchema = z.object({
  integration_id: z.string().min(1),
});

export const connectionsProxySchema = z.object({
  integration_id: z.string().min(1),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const fieldsProxySchema = z.object({
  integration_id: z.string().min(1),
  connection_key: z.string().optional(),
  account_id: z.string().optional(),
  data_view: z.string().optional(),
  include_custom_fields: z.boolean().optional(),
});
