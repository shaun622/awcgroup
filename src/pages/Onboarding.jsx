import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Mail, LogOut } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'
import { useBusiness } from '../contexts/BusinessContext'
import { supabase } from '../lib/supabase'

/**
 * Onboarding — invite-only landing page.
 *
 * AWC is a single-tenant internal tool for A Wilkinson Company; we don't
 * want every signup to spawn a new business row (which is what the old
 * onboarding flow did, hence the duplicates we cleaned up). Instead:
 *
 * 1. The owner creates the business once (already done — andrew@awcgroup.uk).
 * 2. The owner invites a new employee via Settings → Team & roles → Add staff.
 *    That inserts a `staff_members` row with the invitee's email and a NULL
 *    `auth_user_id`.
 * 3. The invitee signs up at /signup with the same email. After confirming,
 *    they land here.
 * 4. We look up a pending staff_members row by their email + null
 *    auth_user_id, attach their auth user id to it, refetch the business
 *    via BusinessContext, and route them into the app.
 * 5. If no invite exists, we show an "Awaiting invitation" screen and
 *    a sign-out button — they can't create a new business.
 *
 * The owner's path skips this page entirely: BusinessContext finds their
 * owned business via the owner_id check and routes to /. (See
 * BusinessGuard for the routing rule.)
 */
export default function Onboarding() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { business, refetch, loading: bizLoading } = useBusiness()
  const [linking, setLinking] = useState(true)
  const [linkResult, setLinkResult] = useState(null) // 'linked' | 'no-invite'

  // BusinessGuard already routed us here, meaning BusinessContext
  // didn't find a business via owner_id OR via staff_members.auth_user_id.
  // Last resort: call the claim_invite() SECURITY DEFINER RPC, which
  // looks up a pending staff_members row by the caller's auth.email
  // + null auth_user_id, and links it. RPC bypasses RLS for this one
  // narrow operation — see migration 017_claim_invite_fn.sql.
  useEffect(() => {
    if (!user || business) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('claim_invite')
      if (cancelled) return
      if (error) {
        console.error('claim_invite error:', error)
        setLinking(false)
        setLinkResult('no-invite')
        return
      }
      if (data?.ok) {
        // BusinessContext picks up the new staff link on next refetch.
        await refetch()
        if (cancelled) return
        setLinkResult('linked')
        navigate('/', { replace: true })
        return
      }
      setLinking(false)
      setLinkResult('no-invite')
    })()
    return () => { cancelled = true }
  }, [user, business, refetch, navigate])

  // If BusinessContext eventually finds a business while we're sitting
  // here (refetch landed), bounce out.
  useEffect(() => {
    if (business) navigate('/', { replace: true })
  }, [business, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  // Loading shimmer while we check for an invite — keeps the page from
  // flashing the "no invite" state on first paint.
  if (linking || bizLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-page dark:bg-gray-950">
        <div className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          Checking your invite…
        </div>
      </main>
    )
  }

  // No invite found — show the awaiting-invite screen.
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-page dark:bg-gray-950">
      <div className="w-full max-w-md animate-slide-up">
        <Card className="p-6 space-y-5 shadow-soft-lift">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Awaiting invitation</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Your account <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span> isn't linked to AWC Group yet.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-4 text-[13px] text-gray-700 dark:text-gray-300 space-y-2">
            <p className="inline-flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
              <Mail className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> What to do
            </p>
            <p>Ask the AWC Group account owner to add you as a staff member. They'll invite you using the email you signed up with — once they do, sign back in and you'll land straight in the app.</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2">
              Already invited? Make sure your invitation email matches <span className="font-mono">{user?.email}</span> — case-insensitive but otherwise exact.
            </p>
          </div>

          <Button onClick={handleSignOut} variant="secondary" leftIcon={<LogOut className="w-4 h-4" />} className="w-full">
            Sign out
          </Button>
        </Card>
      </div>
    </main>
  )
}
