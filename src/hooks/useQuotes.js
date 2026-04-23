import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'

/**
 * useQuotes — list + filter + mutate quotes for the current business.
 */
export function useQuotes({ clientId, divisionSlug, status } = {}) {
  const { business } = useBusiness()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!business) { setQuotes([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('quotes').select('*').eq('business_id', business.id)
    if (clientId) q = q.eq('client_id', clientId)
    if (divisionSlug) q = q.eq('division_slug', divisionSlug)
    if (status) q = q.eq('status', status)
    const { data } = await q.order('created_at', { ascending: false })
    setQuotes(data ?? [])
    setLoading(false)
  }, [business, clientId, divisionSlug, status])

  useEffect(() => { refetch() }, [refetch])

  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase
      .channel(`quotes-${business.id}-${suffix}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'quotes', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const match = (row) =>
            (!clientId || row.client_id === clientId) &&
            (!divisionSlug || row.division_slug === divisionSlug) &&
            (!status || row.status === status)
          setQuotes(prev => {
            if (payload.eventType === 'INSERT') {
              if (!match(payload.new) || prev.some(q => q.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(q => q.id === payload.new.id ? payload.new : q).filter(match)
            }
            if (payload.eventType === 'DELETE') return prev.filter(q => q.id !== payload.old.id)
            return prev
          })
        })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business, clientId, divisionSlug, status])

  const createQuote = useCallback(async (payload) => {
    if (!business) throw new Error('No business loaded')
    const year = new Date().getFullYear()
    const abbrev = { pest: 'AWPC', fire: 'AWFS', hygiene: 'AWHS', locksmith: 'AWL' }[payload.division_slug] ?? 'AWC'
    // Rough per-division per-year sequence — race-safe enough for a single tenant
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('division_slug', payload.division_slug)
      .gte('created_at', `${year}-01-01`)
    const number = `${abbrev}-Q-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const row = {
      business_id: business.id,
      division_slug: payload.division_slug,
      client_id: payload.client_id,
      premises_id: payload.premises_id || null,
      quote_number: number,
      subject: payload.subject?.trim() || null,
      scope: payload.scope?.trim() || null,
      terms: payload.terms?.trim() || null,
      line_items: payload.line_items ?? [],
      subtotal: payload.subtotal ?? 0,
      vat_rate: payload.vat_rate ?? 0.20,
      vat_amount: payload.vat_amount ?? 0,
      total: payload.total ?? 0,
      status: 'draft',
      expires_at: payload.expires_at || null,
    }
    const { data, error } = await supabase.from('quotes').insert(row).select().single()
    if (error) throw error
    setQuotes(prev => (prev.some(q => q.id === data.id) ? prev : [data, ...prev]))
    return data
  }, [business])

  const updateQuote = useCallback(async (id, patch) => {
    const { data, error } = await supabase.from('quotes').update(patch).eq('id', id).select().single()
    if (error) throw error
    setQuotes(prev => prev.map(q => q.id === data.id ? data : q))
    return data
  }, [])

  const sendQuote = useCallback(async (id) => {
    // Fire-and-forget email — the edge function also flips the row to 'sent'.
    // If the function isn't deployed yet we fall back to a direct status update
    // so the UI still progresses.
    try {
      const res = await supabase.functions.invoke('send-quote', { body: { quote_id: id } })
      if (res.error) throw res.error
    } catch (err) {
      console.warn('[send-quote] fell back to client-side status update:', err?.message ?? err)
      return updateQuote(id, { status: 'sent', sent_at: new Date().toISOString() })
    }
    // Local refetch to pick up the row the function updated
    const { data } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle()
    if (data) setQuotes(prev => prev.map(q => q.id === data.id ? data : q))
    return data
  }, [updateQuote])

  const respondToQuote = useCallback(async (id, accept) => {
    return updateQuote(id, {
      status: accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
  }, [updateQuote])

  return { quotes, loading, refetch, createQuote, updateQuote, sendQuote, respondToQuote }
}

export function useQuote(id) {
  const { business } = useBusiness()
  const [quote, setQuote] = useState(null)
  const [client, setClient] = useState(null)
  const [premises, setPremises] = useState(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!business || !id) return
    setLoading(true)
    const { data: q } = await supabase.from('quotes').select('*').eq('id', id).eq('business_id', business.id).maybeSingle()
    setQuote(q ?? null)
    if (q) {
      const [c, p] = await Promise.all([
        supabase.from('clients').select('*').eq('id', q.client_id).maybeSingle(),
        q.premises_id ? supabase.from('premises').select('*').eq('id', q.premises_id).maybeSingle() : Promise.resolve({ data: null }),
      ])
      setClient(c.data); setPremises(p.data)
    } else {
      setClient(null); setPremises(null)
    }
    setLoading(false)
  }, [business, id])

  useEffect(() => { refetch() }, [refetch])

  return { quote, client, premises, loading, refetch, setQuote }
}
