import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { logActivity } from '../lib/activity'

/**
 * useClients — load + search + mutate clients for the current business.
 * Automatic division scoping isn't applied here because clients are
 * business-wide (shared across all divisions). Division-scoped filters
 * happen at the premises/jobs level.
 */
export function useClients({ search = '' } = {}) {
  const { business } = useBusiness()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!business) { setClients([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
    if (error) setError(error)
    else setClients(data ?? [])
    setLoading(false)
  }, [business])

  useEffect(() => { refetch() }, [refetch])

  // Realtime — replace/add/remove as events arrive
  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase
      .channel(`clients-${business.id}-${suffix}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'clients', filter: `business_id=eq.${business.id}` },
        (payload) => {
          setClients(prev => {
            if (payload.eventType === 'INSERT') {
              if (prev.some(c => c.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(c => c.id === payload.new.id ? payload.new : c)
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(c => c.id !== payload.old.id)
            }
            return prev
          })
        })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.postcode?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    )
  }, [clients, search])

  const addClient = useCallback(async (payload) => {
    if (!business) throw new Error('No business loaded')
    const row = {
      business_id: business.id,
      name: payload.name?.trim(),
      client_type: payload.client_type ?? 'residential',
      email: payload.email || null,
      phone: payload.phone || null,
      address_line_1: payload.address_line_1 || null,
      address_line_2: payload.address_line_2 || null,
      city: payload.city || null,
      postcode: payload.postcode || null,
      notes: payload.notes || null,
      pipeline_stage: payload.pipeline_stage ?? 'lead',
    }
    const { data, error } = await supabase
      .from('clients')
      .insert(row)
      .select()
      .single()
    if (error) throw error
    // Optimistic merge in case realtime lags
    setClients(prev => (prev.some(c => c.id === data.id) ? prev : [data, ...prev]))
    logActivity({
      business_id: business.id,
      event_type: 'client_added',
      title: `New client: ${data.name}`,
      subtitle: data.email || data.city || null,
      entity_type: 'client',
      entity_id: data.id,
    })
    return data
  }, [business])

  const updateClient = useCallback(async (id, patch) => {
    const clean = {
      name: patch.name?.trim(),
      client_type: patch.client_type,
      email: patch.email ?? null,
      phone: patch.phone ?? null,
      address_line_1: patch.address_line_1 ?? null,
      address_line_2: patch.address_line_2 ?? null,
      city: patch.city ?? null,
      postcode: patch.postcode ?? null,
      notes: patch.notes ?? null,
      pipeline_stage: patch.pipeline_stage,
    }
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k])
    const { data, error } = await supabase.from('clients').update(clean).eq('id', id).select().single()
    if (error) throw error
    setClients(prev => prev.map(c => c.id === id ? data : c))
    return data
  }, [])

  const deleteClient = useCallback(async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
    setClients(prev => prev.filter(c => c.id !== id))
  }, [])

  return { clients: filtered, allClients: clients, loading, error, refetch, addClient, updateClient, deleteClient }
}

export function useClient(id) {
  const { business } = useBusiness()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business || !id) return
    let alive = true
    setLoading(true)
    supabase.from('clients').select('*').eq('id', id).eq('business_id', business.id).maybeSingle()
      .then(({ data }) => { if (alive) { setClient(data); setLoading(false) } })
    return () => { alive = false }
  }, [business, id])

  return { client, loading, setClient }
}
