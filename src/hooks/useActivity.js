import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'

/**
 * useActivity — latest activity_feed rows for the current business.
 * Prepends new inserts via Supabase Realtime.
 */
export function useActivity({ limit = 20, divisionSlug } = {}) {
  const { business } = useBusiness()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!business) { setActivities([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('activity_feed').select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (divisionSlug) q = q.eq('division_slug', divisionSlug)
    const { data } = await q
    setActivities(data ?? [])
    setLoading(false)
  }, [business, limit, divisionSlug])

  useEffect(() => { refetch() }, [refetch])

  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase.channel(`activity-${business.id}-${suffix}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed', filter: `business_id=eq.${business.id}` },
        (payload) => {
          if (divisionSlug && payload.new.division_slug !== divisionSlug) return
          setActivities(prev => {
            if (prev.some(a => a.id === payload.new.id)) return prev
            return [payload.new, ...prev].slice(0, limit)
          })
        })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business, divisionSlug, limit])

  return { activities, loading, refetch }
}

/** Pretty variant + dot colour for a given event_type */
export function activityPresentation(type) {
  const m = {
    client_added:     { variant: 'default', label: 'New client' },
    job_created:      { variant: 'primary', label: 'Job scheduled' },
    job_completed:    { variant: 'success', label: 'Job completed' },
    quote_sent:       { variant: 'primary', label: 'Quote sent' },
    quote_accepted:   { variant: 'success', label: 'Quote accepted' },
    quote_declined:   { variant: 'danger',  label: 'Quote declined' },
    quote_viewed:     { variant: 'default', label: 'Quote viewed' },
    report_completed: { variant: 'success', label: 'Report sent' },
    invoice_paid:     { variant: 'success', label: 'Invoice paid' },
    payment_received: { variant: 'success', label: 'Payment received' },
    recurring_created:{ variant: 'primary', label: 'Recurring set up' },
  }
  return m[type] ?? { variant: 'default', label: type?.replace(/_/g, ' ') ?? '—' }
}
