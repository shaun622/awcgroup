import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Send, CheckCircle2, Receipt,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input, { Select, TextArea } from '../components/ui/Input'
import DivisionChip from '../components/ui/DivisionChip'
import AddClientModal from '../components/ui/AddClientModal'
import { SkeletonCard } from '../components/ui/Skeleton'
import { useInvoice, useInvoices } from '../hooks/useInvoices'
import { useClients } from '../hooks/useClients'

const ADD_SENTINEL = '__add__'
import { useBusiness } from '../contexts/BusinessContext'
import { supabase } from '../lib/supabase'
import { calculateVAT, cn, formatDate, formatGBP, statusLabel, statusVariant } from '../lib/utils'

const BLANK_LINE = { description: '', qty: 1, unit_price: 0 }

export default function InvoiceBuilder() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isNew = !id
  const navigate = useNavigate()

  const { business } = useBusiness()
  const { invoice, client: loadedClient, loading } = useInvoice(id)
  const { createInvoice, updateInvoice, sendInvoice, markPaid } = useInvoices()
  const { allClients, addClient } = useClients()
  const [addClientOpen, setAddClientOpen] = useState(false)

  const [clientId, setClientId] = useState('')
  const [divisionSlug, setDivisionSlug] = useState('')
  const [jobId, setJobId] = useState('')
  const [quoteId, setQuoteId] = useState('')
  const [lineItems, setLineItems] = useState([BLANK_LINE])
  const [vatRate, setVatRate] = useState(0.20)
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Hydrate from existing invoice
  useEffect(() => {
    if (!invoice) return
    setClientId(invoice.client_id)
    setDivisionSlug(invoice.division_slug ?? '')
    setJobId(invoice.job_id ?? '')
    setQuoteId(invoice.quote_id ?? '')
    setLineItems(invoice.line_items?.length ? invoice.line_items : [BLANK_LINE])
    setVatRate(Number(invoice.vat_rate ?? 0.20))
    setIssueDate(invoice.issue_date)
    setDueDate(invoice.due_date)
    setNotes(invoice.notes ?? '')
  }, [invoice?.id])

  // Hydrate from ?from=job:ID or ?from=quote:ID (one-off on mount)
  useEffect(() => {
    if (!isNew || !business) return
    const from = searchParams.get('from')
    if (!from) return
    const [kind, srcId] = from.split(':')
    ;(async () => {
      if (kind === 'job') {
        const { data: j } = await supabase.from('jobs').select('*').eq('id', srcId).maybeSingle()
        if (!j) return
        setClientId(j.client_id)
        setDivisionSlug(j.division_slug)
        setJobId(j.id)
        setQuoteId(j.quote_id ?? '')
        setLineItems([{
          description: j.title + (j.job_type ? ` (${j.job_type})` : ''),
          qty: 1,
          unit_price: Number(j.price ?? 0),
        }])
      } else if (kind === 'quote') {
        const { data: q } = await supabase.from('quotes').select('*').eq('id', srcId).maybeSingle()
        if (!q) return
        setClientId(q.client_id)
        setDivisionSlug(q.division_slug)
        setQuoteId(q.id)
        setLineItems(q.line_items?.length ? q.line_items : [BLANK_LINE])
        setVatRate(Number(q.vat_rate ?? 0.20))
      }
    })()
  }, [isNew, business, searchParams])

  // Auto-compute due date from terms if not set
  useEffect(() => {
    if (dueDate || !business) return
    const days = business.default_payment_terms_days ?? 14
    const d = new Date(issueDate)
    d.setDate(d.getDate() + days)
    setDueDate(d.toISOString().slice(0, 10))
  }, [issueDate, business, dueDate])

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((acc, l) => acc + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0)
    const { vatAmount, total } = calculateVAT(subtotal, vatRate)
    return { subtotal: +subtotal.toFixed(2), vatAmount, total }
  }, [lineItems, vatRate])

  const readOnly = invoice && ['sent', 'paid', 'void'].includes(invoice.status)

  const setLine = (i, patch) => setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  const addLine = () => setLineItems(prev => [...prev, { ...BLANK_LINE }])
  const removeLine = (i) => setLineItems(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i))

  const save = async (andSend) => {
    if (!clientId) { toast.error('Pick a client'); return }
    const cleanLines = lineItems
      .filter(l => l.description?.trim())
      .map(l => ({
        description: l.description.trim(),
        qty: Number(l.qty) || 0,
        unit_price: Number(l.unit_price) || 0,
        line_total: +((Number(l.qty) || 0) * (Number(l.unit_price) || 0)).toFixed(2),
      }))
    if (cleanLines.length === 0) { toast.error('Add at least one line item'); return }

    setSaving(true)
    try {
      const payload = {
        division_slug: divisionSlug || null,
        client_id: clientId,
        job_id: jobId || null,
        quote_id: quoteId || null,
        line_items: cleanLines,
        subtotal: totals.subtotal,
        vat_rate: vatRate,
        vat_amount: totals.vatAmount,
        total: totals.total,
        issue_date: issueDate,
        due_date: dueDate,
        notes: notes || null,
      }
      let saved
      if (isNew) {
        saved = await createInvoice(payload)
      } else {
        saved = await updateInvoice(id, payload)
      }
      if (andSend) await sendInvoice(saved.id)
      toast.success(isNew ? 'Invoice created' : 'Invoice saved')
      navigate(`/invoices/${saved.id}`, { replace: true })
    } catch (err) {
      toast.error('Could not save invoice', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const recordPayment = async () => {
    setSaving(true)
    try {
      await markPaid(id)
      toast.success('Marked paid')
      // Invoice state is local — refetch via a re-read
      navigate(`/invoices/${id}`, { replace: true })
    } catch (err) {
      toast.error('Could not update', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (!isNew && loading) return <PageWrapper size="xl"><SkeletonCard /></PageWrapper>

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate('/invoices')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Invoices
      </button>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {divisionSlug && <DivisionChip slug={divisionSlug} variant="soft" size="sm" />}
            {invoice && <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>}
            {invoice?.invoice_number && (
              <span className="text-xs font-mono text-gray-400">{invoice.invoice_number}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {isNew ? 'New invoice' : invoice?.invoice_number}
          </h1>
        </div>
        {invoice && invoice.status === 'sent' && (
          <Button size="sm" leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={recordPayment}>Record payment</Button>
        )}
      </div>

      <div className="grid gap-3 mb-4 md:grid-cols-2">
        <Select
          label="Client"
          value={clientId}
          onChange={e => {
            if (e.target.value === ADD_SENTINEL) { setAddClientOpen(true); return }
            setClientId(e.target.value)
          }}
          disabled={readOnly || !isNew}
          required
        >
          <option value="">— Pick a client —</option>
          {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {!readOnly && isNew && (<>
            <option disabled>──────────</option>
            <option value={ADD_SENTINEL}>+ Add new client…</option>
          </>)}
        </Select>

        <Input label="Issue date" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} disabled={readOnly} />
        <Input label="Due date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={readOnly} />

        {business?.bank_details && (
          <div className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
            Bank details: {JSON.stringify(business.bank_details)}
          </div>
        )}
      </div>

      {/* Line items */}
      <Card className="mb-4 !p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Line items</h2>
          {!readOnly && <Button size="sm" variant="secondary" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={addLine}>Add line</Button>}
        </div>
        <div className="space-y-2">
          {lineItems.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <Input className="col-span-12 sm:col-span-6" placeholder="Description" value={line.description} onChange={e => setLine(i, { description: e.target.value })} disabled={readOnly} />
              <Input className="col-span-4 sm:col-span-2" type="number" min="0" step="0.5" placeholder="Qty" value={line.qty} onChange={e => setLine(i, { qty: e.target.value })} disabled={readOnly} />
              <Input className="col-span-5 sm:col-span-3" type="number" min="0" step="0.01" leftAdornment="£" placeholder="Unit" value={line.unit_price} onChange={e => setLine(i, { unit_price: e.target.value })} disabled={readOnly} />
              <div className="col-span-3 sm:col-span-1 flex items-center justify-end h-[48px]">
                {!readOnly && lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1.5 ml-auto max-w-xs text-sm">
          <Row label="Subtotal" value={formatGBP(totals.subtotal)} />
          <Row label={`VAT (${Math.round(vatRate * 100)}%)`} value={formatGBP(totals.vatAmount)} />
          <Row label="Total" value={formatGBP(totals.total)} big />
        </div>
      </Card>

      <div className="mb-4">
        <TextArea label="Notes (optional)" rows={3} value={notes} onChange={e => setNotes(e.target.value)} disabled={readOnly} placeholder="Reference numbers, payment instructions, etc." />
      </div>

      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="secondary" onClick={() => save(false)} loading={saving} className="flex-1">
            {isNew ? 'Save draft' : 'Save changes'}
          </Button>
          <Button onClick={() => save(true)} loading={saving} leftIcon={<Send className="w-4 h-4" />} className="flex-1">
            Save & mark as sent
          </Button>
        </div>
      )}

      <AddClientModal
        open={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        addClient={addClient}
        onCreated={(c) => { setClientId(c.id); setAddClientOpen(false) }}
      />
    </PageWrapper>
  )
}

function Row({ label, value, big }) {
  return (
    <div className={cn('flex justify-between items-baseline', big && 'pt-1.5 border-t border-gray-100 dark:border-gray-800')}>
      <span className={cn('text-gray-500', big && 'font-semibold text-gray-900 dark:text-gray-100')}>{label}</span>
      <span className={cn('tabular-nums', big ? 'text-lg font-bold text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100')}>{value}</span>
    </div>
  )
}
