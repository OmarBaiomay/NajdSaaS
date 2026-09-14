# NajdSaaS

Multi-tenant SaaS dashboard foundation: **Agencies** (platform customers) managing their own **Tenants** (sub-accounts), each with scoped dashboards, users, and roles.

## Stack

- **Frontend**: React 18 + Vite + TypeScript, Tailwind CSS (dark mode via `class`), GSAP, Three.js, Recharts, react-i18next (English/Arabic, RTL-aware)
- **Backend**: Node.js + Express + TypeScript, Prisma (PostgreSQL), Redis (sessions/refresh tokens)
- **Monorepo**: pnpm workspaces + Turborepo

## Structure

```
apps/
  web/     React dashboard (Agency + Tenant views)
  api/     Express API
packages/
  types/   Shared TS types between web and api
```

## Multi-tenancy model

- `Agency` — a NajdSaaS customer (the "agency" running the platform for its own clients).
- `Tenant` — a sub-account under an Agency.
- `User` — belongs to an Agency and optionally a Tenant, with a `Role`:
  `SUPER_ADMIN` (platform) → `AGENCY_OWNER`/`AGENCY_STAFF` (agency-wide) → `TENANT_OWNER`/`TENANT_MEMBER` (single tenant).

Isolation is **shared-schema**: every row carries `agencyId` (and `tenantId` where relevant). It's enforced twice:
1. **App layer** — `requireAuth` + `resolveTenantScope` + `requireRole` middleware (`apps/api/src/middleware`).
2. **Database layer** — Postgres Row-Level Security policies (`apps/api/prisma/sql/rls.sql`) keyed off session variables set per-request/transaction in `withTenantContext` (`apps/api/src/config/db.ts`). RLS is the backstop if a query ever forgets a `WHERE`.

## Getting started

```bash
corepack enable && corepack prepare pnpm@9.12.0 --activate
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

pnpm docker:up            # Postgres + Redis
pnpm db:generate
pnpm db:migrate           # creates tables
psql "$DATABASE_URL" -f apps/api/prisma/sql/rls.sql   # apply RLS policies

pnpm dev                  # runs web (5173) + api (4000) in parallel
```

First account: `POST /api/auth/register` with `{ agencyName, agencySlug, email, password }` creates an Agency + its first `AGENCY_OWNER`.

## Reporting Ninja integration

Each **tenant** connects their own [Reporting Ninja](https://www.reportingninja.com/) API key (Settings → Reporting Ninja) to pull marketing/reporting data (Meta Ads, Google Ads, GA4, TikTok, Shopify, HubSpot, etc. — anything in their Reporting Ninja account) into modern glow-card + chart widgets on the Reports page.

- The key is **never stored in plaintext** — `apps/api/src/utils/crypto.ts` encrypts it with AES-256-GCM using `CREDENTIALS_ENCRYPTION_KEY` (generate with `openssl rand -hex 32`), and the API never returns the full key back to the client (only a `••••1234`-style preview).
- "Save & test" immediately calls Reporting Ninja's `/integrations` endpoint with the key to confirm it's valid before marking the tenant `CONNECTED`; a "Re-test connection" button repeats that check any time.
- All Reporting Ninja calls happen **server-side** (`apps/api/src/modules/integrations/reportingNinja.*`) — the browser only ever talks to our own `/api/integrations/reporting-ninja/*` routes, tenant-scoped like everything else via `resolveTenantScope`.
- The Reports page (`apps/web/src/pages/tenant/Reports.tsx`) is generic across integrations: pick an integration → account → metrics (discovered live via Reporting Ninja's `/fields`), and it renders a 30-day trend as `GlowCard`s + a chart.

## What's scaffolded

- JWT access/refresh auth (httpOnly cookies, Redis-backed refresh sessions, rotation on refresh)
- RBAC + tenant-scoping middleware
- Agency & Tenant CRUD skeleton (list/create tenants, list users)
- Dashboard shells for both Agency and Tenant scopes, with stat cards + a Recharts revenue chart
- Dark mode (persisted), English/Arabic i18n with automatic `dir="rtl"` switching
- GSAP entrance animation + a Three.js ambient scene on the login screen

## Not yet built (next steps)

- Billing/subscriptions, invitations & email, tenant user-management UI, audit log UI, tests, CI.
- Reporting Ninja: saved/scheduled report configs, cross-tenant agency rollups, `/query/async` for large exports, per-integration field presets (right now metric selection is fully dynamic/generic).
