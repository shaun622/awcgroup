import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { usePlans } from '../hooks/usePlans'

const BusinessContext = createContext(null)

export function BusinessProvider({ children }) {
  const { user } = useAuth()
  const { plansBySlug, loading: plansLoading } = usePlans()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) {
      setBusiness(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!error) setBusiness(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => { refetch() }, [refetch])

  // Effective staff seat limit. HQ admin can pin a per-business override
  // via businesses.staff_seat_override (NULL = use plan default). Note `??`
  // not `||` — `0` is a legal override meaning "no staff allowed", useful
  // for parking delinquent tenants without changing their plan. Plans are
  // per-business not per-division — one set of seats covers all four AWC
  // divisions (pest/hygiene/lock/fire).
  const staffLimit = (() => {
    if (!business) return 1
    if (business.staff_seat_override != null) return business.staff_seat_override
    return plansBySlug?.[business.plan]?.max_staff ?? 1
  })()

  return (
    <BusinessContext.Provider value={{ business, staffLimit, loading: loading || plansLoading, refetch, setBusiness }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness must be used within <BusinessProvider>')
  return ctx
}
