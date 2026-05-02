-- Invite-claim RPC for the invite-only Onboarding flow.
--
-- Background: AWC is an invite-only single-tenant app. The owner adds
-- a new employee via Settings → Team & roles → Add staff, which inserts
-- a staff_members row with the invitee's email and a NULL auth_user_id.
-- The invitee signs up at /signup with that same email, and on first
-- sign-in lands at /onboarding — which calls this RPC to claim their
-- pending invite and link auth_user_id.
--
-- We can't do the lookup + update straight from the client because the
-- staff_members RLS policies (correctly) restrict reads to "your own
-- business" — but the invitee doesn't *have* a business yet. SECURITY
-- DEFINER lets this function bypass RLS for the narrow operation of
-- linking by-email + null auth_user_id, which is the only way an
-- unattached user can become attached. The function returns a small
-- JSONB payload telling the client whether the link succeeded.
--
-- Returns:
--   { ok: true,  business_id: uuid, staff_id: uuid }     on link
--   { ok: false, reason: 'not_authenticated' | 'no_email' | 'no_invite' }
--
-- Owner accounts never call this — BusinessContext finds their owned
-- business via the owner_id path before Onboarding ever mounts.

create or replace function public.claim_invite()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_id    uuid;
  caller_email text;
  invite_row   staff_members;
begin
  caller_id := auth.uid();
  if caller_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select email into caller_email from auth.users where id = caller_id;
  if caller_email is null then
    return jsonb_build_object('ok', false, 'reason', 'no_email');
  end if;

  -- Find the pending invite (case-insensitive email, null auth_user_id,
  -- active = true). If somehow there are multiple, pick the oldest —
  -- the operator can delete duplicates from HQ admin.
  select * into invite_row
  from staff_members
  where lower(trim(email)) = lower(trim(caller_email))
    and auth_user_id is null
    and active = true
  order by created_at asc
  limit 1;

  if invite_row.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_invite');
  end if;

  update staff_members
    set auth_user_id = caller_id
    where id = invite_row.id;

  return jsonb_build_object(
    'ok', true,
    'business_id', invite_row.business_id,
    'staff_id', invite_row.id
  );
end
$$;

revoke all on function public.claim_invite() from public;
grant execute on function public.claim_invite() to authenticated;
