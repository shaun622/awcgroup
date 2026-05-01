-- DB-backed plan catalog. AWC Group's customer-facing Subscription page
-- and the FieldSuite HQ Plans panel both read/write here. Per-business
-- plan field (businesses.plan) references plans.slug informally —
-- there's intentionally NO foreign key so that deactivating a plan
-- via is_active=false doesn't break legacy assignments.
--
-- AWC has FOUR seeded slugs (trial/starter/pro/enterprise) per the
-- existing businesses.plan column comment. Plans apply per-business
-- (one set of seats covers all four divisions: pest/hygiene/lock/fire),
-- not per-division — matches AWC's shared-staff architecture.
--
-- service_role writes; anon read everything (Subscription page is
-- pre-auth on the trial flow). The table holds NO secrets — Stripe
-- price IDs land in a separate non-public column when integrated.

create table if not exists plans (
  slug         text primary key,
  name         text not null,
  price_cents  int  not null default 0,
  period       text not null default 'month',  -- month | year | once
  max_staff    int  not null default 1,
  features     jsonb not null default '{}',
  sort_order   int  not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table plans enable row level security;

-- Public read so the customer's Subscription page (anon key) can fetch
-- the available plans on visit. No insert/update/delete policies →
-- service-role-only writes.
create policy plans_public_read on plans for select using (true);

-- Auto-bump updated_at on every PATCH from HQ admin so we have a
-- recency signal for cache busting later.
create or replace function plans_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists plans_set_updated_at on plans;
create trigger plans_set_updated_at
  before update on plans
  for each row execute function plans_touch_updated_at();

-- Seed: starting values mirror PoolPro for HQ admin consistency, with
-- an additional 'enterprise' tier to match AWC's existing schema. The
-- operator can tune prices, max_staff, names, and features via the HQ
-- admin Plans panel without further migrations. Features dictionary
-- reflects AWC's domain (jobs, divisions, fire-door reports, etc.).
insert into plans (slug, name, price_cents, period, max_staff, features, sort_order, is_active) values
  (
    'trial',
    'Trial',
    0,
    '14 days',
    2,
    jsonb_build_object(
      'jobs',               '10 jobs',
      'staff',              '2 staff members',
      'divisions',          'All four',
      'reportsHistory',     '30 days',
      'quotesPdf',          true,
      'customerPortal',     true,
      'fireDoorReports',    true,
      'recurringJobs',      true,
      'photoAttachments',   false,
      'customBranding',     false,
      'prioritySupport',    false
    ),
    0,
    true
  ),
  (
    'starter',
    'Starter',
    2900,
    'month',
    5,
    jsonb_build_object(
      'jobs',               'Unlimited',
      'staff',              '5 staff members',
      'divisions',          'All four',
      'reportsHistory',     'Unlimited',
      'quotesPdf',          true,
      'customerPortal',     true,
      'fireDoorReports',    true,
      'recurringJobs',      true,
      'photoAttachments',   true,
      'customBranding',     false,
      'prioritySupport',    false
    ),
    1,
    true
  ),
  (
    'pro',
    'Pro',
    5900,
    'month',
    15,
    jsonb_build_object(
      'jobs',               'Unlimited',
      'staff',              '15 staff members',
      'divisions',          'All four',
      'reportsHistory',     'Unlimited',
      'quotesPdf',          true,
      'customerPortal',     true,
      'fireDoorReports',    true,
      'recurringJobs',      true,
      'photoAttachments',   true,
      'customBranding',     true,
      'prioritySupport',    true
    ),
    2,
    true
  ),
  (
    'enterprise',
    'Enterprise',
    14900,
    'month',
    50,
    jsonb_build_object(
      'jobs',               'Unlimited',
      'staff',              '50 staff members',
      'divisions',          'All four',
      'reportsHistory',     'Unlimited',
      'quotesPdf',          true,
      'customerPortal',     true,
      'fireDoorReports',    true,
      'recurringJobs',      true,
      'photoAttachments',   true,
      'customBranding',     true,
      'prioritySupport',    true,
      'dedicatedSupport',   true,
      'sla',                '99.9% uptime'
    ),
    3,
    true
  )
on conflict (slug) do nothing;
