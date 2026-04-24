import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Signup() {
  const { user, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      toast.error('Sign up failed', { description: error.message })
      return
    }
    setSent(true)
    toast.success('Check your email', { description: 'We sent you a confirmation link.' })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-page dark:bg-gray-950">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-awc-900 text-white flex items-center justify-center font-bold text-lg tracking-tight shadow-soft-lift mb-4">AW</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create your account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start running AWC Group operations</p>
        </div>

        <Card className="p-6 space-y-4 shadow-soft-lift">
          {sent ? (
            <div className="text-center py-4 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Check your email</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
            </div>
          ) : (
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
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                hint="Minimum 8 characters."
              />
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5">
                  {error}
                </div>
              )}
              <Button type="submit" loading={loading} className="w-full">Create account</Button>
            </form>
          )}

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Sign in</Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
