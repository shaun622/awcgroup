-- Audit log for operator-level actions taken from FieldSuite HQ admin
-- panel against this AWC Supabase. Every action (password reset, trial
-- extension, plan change, impersonation, set-staff-override, delete
-- business, plan-catalog edit, etc.) writes one row. service_role-only;
-- the customer-facing app cannot read or write this table.
--
-- Mirrors the same table on PoolPro / Tree Mate so HQ admin's
-- logAction helper writes the same shape per app.

create table if not exists operator_actions (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  -- Currently a placeholder ("operator-passcode") until Cloudflare
  -- Access is in front of /admin. After that this becomes the
  -- cf-access-authenticated-user-email header value.
  operator_email text not null,
  business_id uuid references businesses(id) on delete set null,
  action text not null,
  payload jsonb,
  ip text
);

create index if not exists idx_operator_actions_business
  on operator_actions(business_id, occurred_at desc);
create index if not exists idx_operator_actions_action
  on operator_actions(action, occurred_at desc);

alter table operator_actions enable row level security;

-- No public policies. service_role bypasses RLS, which is the only
-- intended writer (HQ Pages Functions). If a normal user's JWT ever
-- queries this table, RLS will return zero rows.
