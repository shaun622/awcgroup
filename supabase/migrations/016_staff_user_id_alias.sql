-- Bridge column for FieldSuite HQ admin compatibility. AWC names the
-- auth-user link `staff_members.auth_user_id`; PoolPro / Tree Mate use
-- `user_id`. HQ admin's queries (business.ts and business/delete.ts)
-- expect `user_id`, so expose a generated mirror.
--
-- Same pattern as 014_staff_is_active_alias.sql — read-only, never
-- written by HQ admin; AWC client code keeps using auth_user_id.

alter table staff_members
  add column if not exists user_id uuid
    generated always as (auth_user_id) stored;

comment on column staff_members.user_id is
  'Generated mirror of staff_members.auth_user_id. Exists so FieldSuite HQ admin (which expects PoolPro/Tree Mate naming) can query this column. Read-only — write to .auth_user_id instead.';
