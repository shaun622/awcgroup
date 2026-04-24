import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'

/**
 * usePremises — loads premises for a given scope.
 *
 * @param {object} opts
 * @param {string} [opts.clientId]      - filter to one client
 * @param {string} [opts.divisionSlug]  - filter to one division (null = all enabled)
 */
export function usePremises({ clientId, divisionSlug } = {}) {
  const { business } = useBusiness()
  const [premises, setPremises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!business) { setPremises([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('premises').select('*').eq('business_id', business.id)
    if (clientId) q = q.eq('client_id', clientId)
    if (divisionSlug) q = q.eq('division_slug', divisionSlug)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) setError(error)
    else setPremises(data ?? [])
    setLoading(false)
  }, [business, clientId, divisionSlug])

  useEffect(() => { refetch() }, [refetch])

  // Realtime — merge inserts/updates/deletes
  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase
      .channel(`premises-${business.id}-${suffix}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'premises', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const match = (row) =>
            (!clientId || row.client_id === clientId) &&
            (!divisionSlug || row.division_slug === divisionSlug)
          setPremises(prev => {
            if (payload.eventType === 'INSERT') {
              if (!match(payload.new)) return prev
              if (prev.some(p => p.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(p => p.id === payload.new.id ? payload.new : p).filter(p => match(p))
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(p => p.id !== payload.old.id)
            }
            return prev
          })
        })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business, clientId, divisionSlug])

  const updatePremises = useCallback(async (id, patch) => {
    const clean = { ...patch }
    if (patch.postcode !== undefined) clean.postcode = patch.postcode || null
    if (patch.regular_service === false) {
      clean.service_frequency = null
      clean.next_due_at = null
    }
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k])
    const { data, error } = await supabase.from('premises').update(clean).eq('id', id).select().single()
    if (error) throw error
    setPremises(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [])

  const deletePremises = useCallback(async (id) => {
    const { error } = await supabase.from('premises').delete().eq('id', id)
    if (error) throw error
    setPremises(prev => prev.filter(p => p.id !== id))
  }, [])

  const addPremises = useCallback(async (payload) => {
    if (!business) throw new Error('No business loaded')
    if (!payload.client_id) throw new Error('client_id required')
    if (!payload.division_slug) throw new Error('division_slug required')
    const row = {
      business_id: business.id,
      client_id: payload.client_id,
      division_slug: payload.division_slug,
      name: payload.name?.trim() || null,
      address_line_1: payload.address_line_1?.trim(),
      address_line_2: payload.address_line_2?.trim() || null,
      city: payload.city?.trim() || null,
      postcode: payload.postcode || null,
      site_type: payload.site_type ?? 'commercial',
      access_notes: payload.access_notes?.trim() || null,
      hazards: payload.hazards ?? [],
      regular_service: !!payload.regular_service,
      service_frequency: payload.regular_service ? (payload.service_frequency ?? null) : null,
      next_due_at: payload.regular_service ? (payload.next_due_at ?? null) : null,
      division_data: payload.division_data ?? {},
    }
    const { data, error } = await supabase
      .from('premises')
      .insert(row)
      .select()
      .single()
    if (error) throw error
    // Optimistic merge
    setPremises(prev => (prev.some(p => p.id === data.id) ? prev : [data, ...prev]))
    return data
  }, [business])

  return { premises, loading, error, refetch, addPremises, updatePremises, deletePremises }
}
