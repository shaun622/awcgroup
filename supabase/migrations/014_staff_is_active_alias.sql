-- Bridge column to satisfy FieldSuite HQ admin which queries
-- staff_members.is_active (the PoolPro / Tree Mate convention). AWC's
-- own schema/code uses staff_members.active. Rather than rename
-- (which would touch every AWC client query), expose a read-only
-- generated column so PostgREST returns the same value under both
-- names. HQ admin never writes is_active — it only reads / filters
-- on it (see Field Mate HQ/.../functions/api/admin/business.ts and
-- businesses.ts) — so a generated column is sufficient.
--
-- If/when AWC ever needs to align with the PoolPro convention
-- internally, swap this for a hard rename + code sweep.

alter table staff_members
  add column if not exists is_active boolean
    generated always as (active) stored;

comment on column staff_members.is_active is
  'Generated mirror of staff_members.active. Exists so FieldSuite HQ admin (which expects PoolPro/Tree Mate naming) can query this column. Read-only — write to .active instead.';
