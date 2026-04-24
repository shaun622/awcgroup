import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { logActivity } from '../lib/activity'

/**
 * useInvoices — list + filter + mutate invoices for the current business.
 * Invoice numbering uses the business-level `next_invoice_number` counter
 * (kept on `businesses`) so all invoices share one sequence regardless of
 * division. Format: `{invoice_prefix}-{YYYY}-{NNNN}` (default INV-2026-0001).
 */
export function useInvoices({ clientId, divisionSlug, status } = {}) {
  const { business, refetch: refetchBusiness } = useBusiness()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!business) { setInvoices([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('invoices').select('*').eq('business_id', business.id)
    if (clientId) q = q.eq('client_id', clientId)
    if (divisionSlug) q = q.eq('division_slug', divisionSlug)
    if (status) q = q.eq('status', status)
    const { data } = await q.order('created_at', { ascending: false })
    setInvoices(data ?? [])
    setLoading(false)
  }, [business, clientId, divisionSlug, status])

  useEffect(() => { refetch() }, [refetch])

  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase
      .channel(`invoices-${business.id}-${suffix}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const match = (row) =>
            (!clientId || row.client_id === clientId) &&
            (!divisionSlug || row.division_slug === divisionSlug) &&
            (!status || row.status === status)
          setInvoices(prev => {
            if (payload.eventType === 'INSERT') {
              if (!match(payload.new) || prev.some(i => i.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(i => i.id === payload.new.id ? payload.new : i).filter(match)
            }
            if (payload.eventType === 'DELETE') return prev.filter(i => i.id !== payload.old.id)
            return prev
          })
        })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business, clientId, divisionSlug, status])

  const createInvoice = useCallback(async (payload) => {
    if (!business) throw new Error('No business loaded')
    const year = new Date().getFullYear()
    const prefix = business.invoice_prefix || 'INV'
    const next = business.next_invoice_number || 1
    const invoice_number = `${prefix}-${year}-${String(next).padStart(4, '0')}`

    const row = {
      business_id: business.id,
      division_slug: payload.division_slug ?? null,
      client_id: payload.client_id,
      job_id: payload.job_id ?? null,
      quote_id: payload.quote_id ?? null,
      invoice_number,
      issue_date: payload.issue_date ?? new Date().toISOString().slice(0, 10),
      due_date: payload.due_date ?? dueDateFromTerms(business.default_payment_terms_days ?? 14),
      line_items: payload.line_items ?? [],
      subtotal: payload.subtotal ?? 0,
      vat_rate: payload.vat_rate ?? 0.20,
      vat_amount: payload.vat_amount ?? 0,
      total: payload.total ?? 0,
      status: 'draft',
      payment_terms_days: payload.payment_terms_days ?? business.default_payment_terms_days ?? 14,
      notes: payload.notes ?? null,
    }

    const { data, error } = await supabase.from('invoices').insert(row).select().single()
    if (error) throw error

    // Advance the counter on the business
    await supabase.from('businesses').update({ next_invoice_number: next + 1 }).eq('id', business.id)
    refetchBusiness?.()

    setInvoices(prev => (prev.some(i => i.id === data.id) ? prev : [data, ...prev]))
    return data
  }, [business, refetchBusiness])

  const updateInvoice = useCallback(async (id, patch) => {
    const { data, error } = await supabase.from('invoices').update(patch).eq('id', id).select().single()
    if (error) throw error
    setInvoices(prev => prev.map(i => i.id === data.id ? data : i))
    return data
  }, [])

  const sendInvoice = useCallback(async (id) =>
    updateInvoice(id, { status: 'sent', sent_at: new Date().toISOString() }), [updateInvoice])

  const markPaid = useCallback(async (id, reference) => {
    const data = await updateInvoice(id, { status: 'paid', paid_at: new Date().toISOString(), payment_reference: reference ?? null })
    if (business) {
      logActivity({
        business_id: business.id,
        division_slug: data.division_slug,
        event_type: 'invoice_paid',
        title: `Invoice paid: ${data.invoice_number}`,
        subtitle: data.total ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(data.total)) : null,
        entity_type: 'invoice',
        entity_id: data.id,
      })
    }
    return data
  }, [updateInvoice, business])

  return { invoices, loading, refetch, createInvoice, updateInvoice, sendInvoice, markPaid }
}

export function useInvoice(id) {
  const { business } = useBusiness()
  const [invoice, setInvoice] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!business || !id) return
    setLoading(true)
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).eq('business_id', business.id).maybeSingle()
    setInvoice(inv ?? null)
    if (inv) {
      const { data: c } = await supabase.from('clients').select('*').eq('id', inv.client_id).maybeSingle()
      setClient(c)
    }
    setLoading(false)
  }, [business, id])

  useEffect(() => { refetch() }, [refetch])

  return { invoice, client, loading, refetch }
}

function dueDateFromTerms(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
