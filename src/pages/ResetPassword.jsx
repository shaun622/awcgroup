import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

/**
 * ResetPassword — landed on after the user clicks the reset link in
 * their email. Supabase's auth flow has already swapped the recovery
 * token for a temporary session by the time this component mounts (the
 * AuthContext listener consumes the URL hash params). The user just
 * needs to type a new password and we call updateUser to persist it.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [hasSession, setHasSession] = useState(null)

  // The recovery token from the email becomes a session via Supabase's
  // PKCE flow handled in AuthContext. If we land here without a
  // session (e.g. the link expired or someone bookmarked /reset-password
  // directly), surface a clear message instead of silently failing.
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setHasSession(!!data.session)
    })
    return () => { cancelled = true }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password too short', { description: 'Use at least 8 characters.' })
      return
    }
    if (password !== confirm) {
      toast.error('Passwords don\'t match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error('Could not update password', { description: error.message })
      return
    }
    setDone(true)
    toast.success('Password updated', { description: 'You\'re signed in now.' })
    // The active session means we can route straight into the app.
    setTimeout(() => navigate('/'), 1200)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-page dark:bg-gray-950">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-awc-900 text-white flex items-center justify-center font-bold text-lg tracking-tight shadow-soft-lift mb-4">AW</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AWC Group</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set a new password</p>
        </div>

        <Card className="p-6 space-y-4 !border-gray-200/80 dark:!border-gray-800 shadow-soft-lift">
          {done ? (
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Password updated</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting…</p>
            </div>
          ) : hasSession === false ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Link expired</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This reset link is no longer valid. Request a fresh link from the sign-in page.
              </p>
              <Button onClick={() => navigate('/forgot-password')} className="w-full">Request new link</Button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New password</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Use at least 8 characters.</p>
              </div>
              <form onSubmit={submit} className="space-y-3">
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Input
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
                <Button type="submit" loading={loading} disabled={!password || !confirm} className="w-full">
                  Update password
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}
