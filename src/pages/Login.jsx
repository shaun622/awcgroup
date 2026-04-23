import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Login() {
  const { user, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      toast.error('Sign in failed', { description: error.message })
      return
    }
    toast.success('Welcome back')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-page dark:bg-gray-950">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-awc-900 text-white flex items-center justify-center font-bold text-lg tracking-tight shadow-soft-lift mb-4">AW</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AWC Group</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Field operations for A Wilkinson Company</p>
        </div>

        <Card className="p-6 space-y-4 !border-gray-200/80 dark:!border-gray-800 shadow-soft-lift">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sign in</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Welcome back — let's get to it.</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@awcgroup.co.uk"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5">
                {error}
              </div>
            )}
            <Button type="submit" loading={loading} className="w-full">Sign in</Button>
          </form>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Create one</Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
