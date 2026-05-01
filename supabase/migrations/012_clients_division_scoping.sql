-- Per-division scoping for clients.
--
-- Until now clients were Group-wide ("shared across all four divisions")
-- while every other transactional table — premises, jobs, quotes,
-- invoices, recurring_profiles, job_reports — already carried a
-- division_slug. The operator wants clients scoped per division too,
-- so a "Pest Control client" and a "Fire Safety client" are distinct
-- records even if they share an email / phone.
--
-- Migration shape:
--   1. Add division_slug column (nullable initially so the ADD doesn't
--      reject existing rows)
--   2. Backfill all existing clients to 'pest' as a placeholder. AWC
--      data is currently test/dev per operator confirmation; the user
--      can reassign clients to the right division by editing rows in
--      Studio or recreating in the right division.
--   3. Set NOT NULL + add CHECK constraint matching the rest of the
--      schema (pest/fire/hygiene/locksmith)
--   4. Index on (business_id, division_slug) — matches the pattern used
--      on premises / jobs / quotes for fast division-scoped queries.

alter table clients
  add column if not exists division_slug text;

update clients set division_slug = 'pest' where division_slug is null;

alter table clients
  alter column division_slug set not null;

-- Drop the constraint if it already exists (idempotent re-runs)
alter table clients drop constraint if exists clients_division_slug_check;
alter table clients
  add constraint clients_division_slug_check
    check (division_slug in ('pest','fire','hygiene','locksmith'));

create index if not exists clients_business_division_idx
  on clients (business_id, division_slug);

comment on column clients.division_slug is
  'Division this client belongs to. AWC clients are per-division now (matching premises/jobs/quotes/invoices); a customer used by multiple divisions has a separate clients row per division.';
