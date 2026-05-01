import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

/**
 * ForgotPassword — sends a Supabase password-reset email. Supabase
 * routes the link in the email back to /reset-password (configured via
 * the redirectTo option). The customer clicks the link, lands on
 * /reset-password with a temporary session, sets a new password.
 *
 * The Supabase email template is the default unless the operator
 * customises it in Dashboard → Auth → Email Templates.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Same-origin redirect — works on whatever domain the app is
      // currently deployed at (awcgroup.pages.dev today, the custom
      // domain later) without a code change.
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error('Could not send reset email', { description: error.message })
      return
    }
    setSent(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-page dark:bg-gray-950">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-awc-900 text-white flex items-center justify-center font-bold text-lg tracking-tight shadow-soft-lift mb-4">AW</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AWC Group</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Reset your password</p>
        </div>

        <Card className="p-6 space-y-4 !border-gray-200/80 dark:!border-gray-800 shadow-soft-lift">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Check your inbox</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  If <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span> has an account, a reset link is on its way. Click it within an hour to set a new password.
                </p>
              </div>
              <Link to="/login" className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Forgot password</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">We'll send a reset link to your email.</p>
              </div>
              <form onSubmit={submit} className="space-y-3">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@awcgroup.uk"
                />
                <Button type="submit" loading={loading} disabled={!email.trim()} className="w-full">
                  Send reset link
                </Button>
              </form>
              <Link to="/login" className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}
