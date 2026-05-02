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
    // 1. Owner path — does this auth user own a business?
    const { data: owned } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (owned) {
      setBusiness(owned)
      setLoading(false)
      return
    }
    // 2. Staff path — is this auth user attached to a business via a
    //    staff_members invite? AWC is invite-only (no public Onboarding
    //    creating new businesses) — every non-owner accesses the app
    //    through a staff_members row that links auth_user_id to the
    //    parent business.
    const { data: staffRow } = await supabase
      .from('staff_members')
      .select('*, businesses(*)')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle()
    if (staffRow?.businesses) {
      setBusiness(staffRow.businesses)
      setLoading(false)
      return
    }
    // 3. No business + no invite — Onboarding handles the "awaiting
    //    invite" UX (or the email-match link if a pending invite exists).
    setBusiness(null)
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
