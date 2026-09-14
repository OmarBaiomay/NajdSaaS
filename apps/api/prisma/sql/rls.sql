-- Row-Level Security policies for NajdSaaS
-- Run this after every `prisma migrate dev` / `prisma migrate deploy`.
-- The API sets `app.current_agency_id` (and `app.current_tenant_id`) as
-- Postgres session variables per-request (see src/config/db.ts), so RLS
-- backs up the application-layer tenant scoping middleware even if a
-- query forgets a WHERE clause.

alter table agencies enable row level security;
alter table tenants enable row level security;
alter table users enable row level security;
alter table audit_logs enable row level security;

-- SUPER_ADMIN connections bypass RLS by setting app.bypass_rls = 'on'.
create or replace function najd_bypass_rls() returns boolean as $$
  select current_setting('app.bypass_rls', true) = 'on';
$$ language sql stable;

drop policy if exists agencies_isolation on agencies;
create policy agencies_isolation on agencies
  using (najd_bypass_rls() or id = current_setting('app.current_agency_id', true)::uuid);

drop policy if exists tenants_isolation on tenants;
create policy tenants_isolation on tenants
  using (najd_bypass_rls() or "agencyId" = current_setting('app.current_agency_id', true)::uuid);

drop policy if exists users_isolation on users;
create policy users_isolation on users
  using (najd_bypass_rls() or "agencyId" = current_setting('app.current_agency_id', true)::uuid);

drop policy if exists audit_logs_isolation on audit_logs;
create policy audit_logs_isolation on audit_logs
  using (najd_bypass_rls() or "agencyId" = current_setting('app.current_agency_id', true)::uuid);
