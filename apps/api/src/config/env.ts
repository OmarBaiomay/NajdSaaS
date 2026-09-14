import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  COOKIE_DOMAIN: z.string().default("localhost"),

  // 32-byte key (as hex, 64 chars) used for AES-256-GCM encryption of
  // tenant-supplied third-party API keys (e.g. Reporting Ninja). Generate
  // with `openssl rand -hex 32`. Rotating this invalidates stored keys.
  CREDENTIALS_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "Must be a 64-char hex string (32 bytes) — generate with `openssl rand -hex 32`"),

  REPORTING_NINJA_BASE_URL: z.string().url().default("https://api.reportingninja.com/v1"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
