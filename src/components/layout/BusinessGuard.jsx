import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useBusiness } from '../../contexts/BusinessContext'
import { Loader2 } from 'lucide-react'

/**
 * Gates app routes on a business record existing for the current user.
 * - No business + not on /onboarding → redirect to /onboarding
 * - Has business + on /onboarding → redirect to /
 */
export default function BusinessGuard() {
  const { business, loading } = useBusiness()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-500">
        <Loader2 className="w-6 h-6 animate-spin" aria-label="Loading" />
      </div>
    )
  }

  const onOnboarding = location.pathname === '/onboarding'
  if (!business && !onOnboarding) return <Navigate to="/onboarding" replace />
  if (business && onOnboarding) return <Navigate to="/" replace />

  return <Outlet />
}
