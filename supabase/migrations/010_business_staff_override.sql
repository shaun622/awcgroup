-- Operator override for staff seat limit. NULL = use the business's
-- plan default (plans.max_staff once 011_plans.sql lands). Set by HQ
-- admin via the set-staff-override Pages Function (service-role-only
-- writes).
--
-- AWC's "shared staff Group-wide" architecture means this override
-- applies across all four divisions (pest/hygiene/lock/fire) — a
-- single seat count covers the whole business, matching how staff
-- are tagged with division access rather than owned by a division.
--
-- A non-negative check stops a stray "-1" from leaking through. 0 is
-- legal — it means "no staff allowed" and is useful for parking
-- delinquent tenants without changing their plan.

alter table businesses
  add column if not exists staff_seat_override int;

alter table businesses
  add constraint businesses_staff_seat_override_nonneg
    check (staff_seat_override is null or staff_seat_override >= 0);

comment on column businesses.staff_seat_override is
  'HQ admin override of the plan-default staff seat limit. NULL = use plan default.';
