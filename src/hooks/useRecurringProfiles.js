import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { logActivity } from '../lib/activity'

/**
 * useRecurringProfiles — load + mutate recurring maintenance profiles.
 * Profiles represent "this premises gets a monthly pest visit" kind of
 * contracts. The Schedule page projects the next visit from these.
 *
 * Filters: clientId, premisesId, divisionSlug, status (default: all).
 */
export function useRecurringProfiles({ clientId, premisesId, divisionSlug, status } = {}) {
  const { business } = useBusiness()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!business) { setProfiles([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('recurring_profiles').select('*').eq('business_id', business.id)
    if (clientId) q = q.eq('client_id', clientId)
    if (premisesId) q = q.eq('premises_id', premisesId)
    if (divisionSlug) q = q.eq('division_slug', divisionSlug)
    if (status) q = q.eq('status', status)
    const { data } = await q.order('created_at', { ascending: false })
    setProfiles(data ?? [])
    setLoading(false)
  }, [business, clientId, premisesId, divisionSlug, status])

  useEffect(() => { refetch() }, [refetch])

  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase
      .channel(`recurring-${business.id}-${suffix}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'recurring_profiles', filter: `business_id=eq.${business.id}` },
        () => refetch())
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business, refetch])

  const createProfile = useCallback(async (payload) => {
    if (!business) throw new Error('No business loaded')
    const row = {
      business_id: business.id,
      division_slug: payload.division_slug,
      client_id: payload.client_id,
      premises_id: payload.premises_id || null,
      title: payload.title?.trim(),
      notes: payload.notes?.trim() || null,
      frequency: payload.frequency,
      start_date: payload.start_date,
      duration_type: payload.duration_type ?? 'ongoing',
      end_date: payload.duration_type === 'until_date' ? payload.end_date : null,
      total_visits: payload.duration_type === 'num_visits' ? payload.total_visits : null,
      completed_visits: 0,
      status: 'active',
      assigned_staff_id: payload.assigned_staff_id || null,
      price: payload.price ?? null,
      duration_minutes: payload.duration_minutes ?? null,
    }
    const { data, error } = await supabase.from('recurring_profiles').insert(row).select().single()
    if (error) throw error
    setProfiles(prev => [data, ...prev])
    logActivity({
      business_id: business.id,
      division_slug: data.division_slug,
      event_type: 'recurring_created',
      title: `Recurring set up: ${data.title}`,
      subtitle: data.frequency ? `${data.frequency} from ${data.start_date}` : null,
      entity_type: 'recurring_profile',
      entity_id: data.id,
    })
    return data
  }, [business])

  const updateProfile = useCallback(async (id, patch) => {
    const clean = { ...patch }
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k])
    const { data, error } = await supabase.from('recurring_profiles').update(clean).eq('id', id).select().single()
    if (error) throw error
    setProfiles(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [])

  const cancelProfile = useCallback((id) => updateProfile(id, { status: 'cancelled' }), [updateProfile])
  const pauseProfile = useCallback((id) => updateProfile(id, { status: 'paused' }), [updateProfile])
  const resumeProfile = useCallback((id) => updateProfile(id, { status: 'active' }), [updateProfile])

  const deleteProfile = useCallback(async (id) => {
    const { error } = await supabase.from('recurring_profiles').delete().eq('id', id)
    if (error) throw error
    setProfiles(prev => prev.filter(p => p.id !== id))
  }, [])

  return { profiles, loading, refetch, createProfile, updateProfile, cancelProfile, pauseProfile, resumeProfile, deleteProfile }
}

/**
 * Project the next visit date for a profile: start_date advanced by
 * `completed_visits` intervals of its frequency. Returns a Date or null.
 */
export function projectNextVisit(profile) {
  if (!profile || !profile.start_date) return null
  if (profile.status && profile.status !== 'active') return null
  const d = new Date(profile.start_date + 'T00:00:00')
  const n = profile.completed_visits ?? 0
  switch (profile.frequency) {
    case 'weekly':     d.setDate(d.getDate() + n * 7); break
    case 'fortnightly':d.setDate(d.getDate() + n * 14); break
    case 'monthly':    d.setMonth(d.getMonth() + n); break
    case 'quarterly':  d.setMonth(d.getMonth() + n * 3); break
    case 'biannual':   d.setMonth(d.getMonth() + n * 6); break
    case 'annual':     d.setFullYear(d.getFullYear() + n); break
    default: return null
  }
  // Check duration_type bounds
  if (profile.duration_type === 'until_date' && profile.end_date && d > new Date(profile.end_date)) return null
  if (profile.duration_type === 'num_visits' && profile.total_visits && n >= profile.total_visits) return null
  return d
}
