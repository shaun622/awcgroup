import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Send, Copy, ExternalLink, CheckCircle2, XCircle,
  Building2, MapPin, Calendar, Receipt,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input, { Select, TextArea } from '../components/ui/Input'
import DivisionChip from '../components/ui/DivisionChip'
import AddClientModal from '../components/ui/AddClientModal'
import AddPremisesModal from '../components/ui/AddPremisesModal'
import { SkeletonCard } from '../components/ui/Skeleton'
import { useDivision } from '../contexts/DivisionContext'
import { useClients } from '../hooks/useClients'
import { usePremises } from '../hooks/usePremises'
import { useQuote, useQuotes } from '../hooks/useQuotes'

const ADD_SENTINEL = '__add__'
import { calculateVAT, cn, formatDate, formatGBP, statusLabel, statusVariant } from '../lib/utils'

const BLANK_LINE = { description: '', qty: 1, unit_price: 0 }

export default function QuoteBuilder() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()

  const { quote, client: loadedClient, premises: loadedPremises, loading } = useQuote(id)
  const { createQuote, updateQuote, sendQuote, respondToQuote } = useQuotes()
  const { currentDivision, available } = useDivision()
  const { allClients, addClient } = useClients()
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addPremisesOpen, setAddPremisesOpen] = useState(false)

  const [divisionSlug, setDivisionSlug] = useState(currentDivision?.slug ?? available[0]?.slug ?? 'pest')
  const [clientId, setClientId] = useState('')
  const [premisesId, setPremisesId] = useState('')
  const [subject, setSubject] = useState('')
  const [scope, setScope] = useState('')
  const [terms, setTerms] = useState('Payment due within 14 days of acceptance.')
  const [lineItems, setLineItems] = useState([BLANK_LINE])
  const [vatRate, setVatRate] = useState(0.20)
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)

  // Hydrate from existing quote
  useEffect(() => {
    if (!quote) return
    setDivisionSlug(quote.division_slug)
    setClientId(quote.client_id)
    setPremisesId(quote.premises_id ?? '')
    setSubject(quote.subject ?? '')
    setScope(quote.scope ?? '')
    setTerms(quote.terms ?? '')
    setLineItems(quote.line_items?.length ? quote.line_items : [BLANK_LINE])
    setVatRate(Number(quote.vat_rate ?? 0.20))
    setExpiresAt(quote.expires_at ? quote.expires_at.slice(0, 10) : '')
  }, [quote?.id])

  const { premises: clientPremises, addPremises } = usePremises({
    clientId: clientId || undefined,
    divisionSlug,
  })

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((acc, l) => {
      const q = Number(l.qty) || 0
      const p = Number(l.unit_price) || 0
      return acc + q * p
    }, 0)
    const { vatAmount, total } = calculateVAT(subtotal, vatRate)
    return { subtotal: +subtotal.toFixed(2), vatAmount, total }
  }, [lineItems, vatRate])

  const readOnly = quote && ['sent', 'viewed', 'accepted', 'declined', 'expired'].includes(quote.status)

  const setLine = (i, patch) => {
    setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  const addLine = () => setLineItems(prev => [...prev, { ...BLANK_LINE }])
  const removeLine = (i) => setLineItems(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i))

  const save = async (nextStatusAfter) => {
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
        division_slug: divisionSlug,
        client_id: clientId,
        premises_id: premisesId || null,
        subject: subject || null,
        scope: scope || null,
        terms: terms || null,
        line_items: cleanLines,
        subtotal: totals.subtotal,
        vat_rate: vatRate,
        vat_amount: totals.vatAmount,
        total: totals.total,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      let saved
      if (isNew) {
        saved = await createQuote(payload)
      } else {
        saved = await updateQuote(id, payload)
      }
      if (nextStatusAfter === 'sent') {
        await sendQuote(saved.id)
      }
      toast.success(isNew ? 'Quote created' : 'Quote saved')
      navigate(`/quotes/${saved.id}`, { replace: true })
    } catch (err) {
      toast.error('Could not save quote', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const markAccepted = async () => {
    await respondToQuote(id, true)
    toast.success('Marked as accepted')
  }
  const markDeclined = async () => {
    await respondToQuote(id, false)
    toast.success('Marked as declined')
  }

  const copyPublicLink = async () => {
    if (!quote) return
    const url = `${window.location.origin}/quote/${quote.public_token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Public link copied')
    } catch {
      toast.error('Copy failed', { description: url })
    }
  }

  if (!isNew && loading) {
    return <PageWrapper size="xl"><SkeletonCard /></PageWrapper>
  }

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate('/quotes')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Quotes
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <DivisionChip slug={divisionSlug} variant="soft" size="sm" />
            {quote && <Badge variant={statusVariant(quote.status)}>{statusLabel(quote.status)}</Badge>}
            {quote?.quote_number && (
              <span className="text-xs font-mono text-gray-400">{quote.quote_number}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {isNew ? 'New quote' : (quote?.subject || quote?.quote_number)}
          </h1>
        </div>

        {quote && (
          <div className="flex items-center gap-2 shrink-0">
            {quote.status === 'sent' || quote.status === 'viewed' ? (
              <>
                <Button variant="secondary" size="sm" leftIcon={<XCircle className="w-4 h-4" />} onClick={markDeclined}>
                  Mark declined
                </Button>
                <Button size="sm" leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={markAccepted}>
                  Mark accepted
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Once accepted, offer to raise an invoice */}
      {quote?.status === 'accepted' && (
        <Card className="mb-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 flex items-center gap-3 !p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Quote accepted</p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
              {quote.responded_at && `Accepted ${formatDate(quote.responded_at)}`}
            </p>
          </div>
          <Button size="sm" onClick={() => navigate(`/invoices/new?from=quote:${quote.id}`)}>
            Raise invoice
          </Button>
        </Card>
      )}

      {/* Public link row (once sent) */}
      {quote && ['sent', 'viewed', 'accepted', 'declined'].includes(quote.status) && (
        <Card className="mb-4 !p-4">
          <div className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
            <code className="text-xs font-mono truncate flex-1 text-gray-600 dark:text-gray-300">
              {window.location.origin}/quote/{quote.public_token}
            </code>
            <Button size="sm" variant="secondary" leftIcon={<Copy className="w-3.5 h-3.5" />} onClick={copyPublicLink}>Copy</Button>
          </div>
        </Card>
      )}

      {/* Division picker (new only) */}
      {isNew && (
        <div className="mb-4 space-y-1.5">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Division</label>
          <div className="flex flex-wrap gap-2">
            {available.map(div => {
              const isActive = divisionSlug === div.slug
              return (
                <button
                  key={div.slug}
                  type="button"
                  onClick={() => setDivisionSlug(div.slug)}
                  className={cn(
                    'rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all min-h-[44px] flex items-center gap-1.5',
                    isActive ? '' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 text-gray-600 dark:text-gray-400',
                  )}
                  style={isActive ? { borderColor: div.brand_hex, backgroundColor: `${div.brand_hex}15`, color: div.brand_hex } : {}}
                >
                  <div.icon className="w-4 h-4" strokeWidth={2.2} />
                  {div.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Context */}
      <div className="grid gap-3 mb-4 md:grid-cols-2">
        <Select
          label="Client"
          value={clientId}
          onChange={e => {
            if (e.target.value === ADD_SENTINEL) { setAddClientOpen(true); return }
            setClientId(e.target.value); setPremisesId('')
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

        {clientId && (
          <Select
            label="Premises (optional)"
            value={premisesId}
            onChange={e => {
              if (e.target.value === ADD_SENTINEL) { setAddPremisesOpen(true); return }
              setPremisesId(e.target.value)
            }}
            disabled={readOnly}
          >
            <option value="">— No specific premises —</option>
            {clientPremises.map(p => (
              <option key={p.id} value={p.id}>
                {p.name ? `${p.name} · ${p.address_line_1}` : p.address_line_1}
              </option>
            ))}
            {!readOnly && (<>
              <option disabled>──────────</option>
              <option value={ADD_SENTINEL}>+ Add new premises…</option>
            </>)}
          </Select>
        )}
      </div>

      <AddClientModal
        open={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        addClient={addClient}
        onCreated={(c) => { setClientId(c.id); setPremisesId(''); setAddClientOpen(false) }}
      />
      <AddPremisesModal
        open={addPremisesOpen}
        onClose={() => setAddPremisesOpen(false)}
        client={allClients.find(c => c.id === clientId) || null}
        addPremises={addPremises}
        onCreated={(p) => { setPremisesId(p.id); setAddPremisesOpen(false) }}
      />

      <div className="grid gap-3 mb-4 md:grid-cols-2">
        <Input label="Subject" value={subject} onChange={e => setSubject(e.target.value)} disabled={readOnly} placeholder="e.g. Monthly pest management" />
        <Input label="Expires on (optional)" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} disabled={readOnly} />
      </div>

      {/* Line items */}
      <Card className="mb-4 !p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Line items</h2>
          {!readOnly && (
            <Button size="sm" variant="secondary" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={addLine}>
              Add line
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {lineItems.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <Input
                className="col-span-12 sm:col-span-6"
                placeholder="Description"
                value={line.description}
                onChange={e => setLine(i, { description: e.target.value })}
                disabled={readOnly}
              />
              <Input
                className="col-span-4 sm:col-span-2"
                type="number"
                min="0"
                step="0.5"
                placeholder="Qty"
                value={line.qty}
                onChange={e => setLine(i, { qty: e.target.value })}
                disabled={readOnly}
              />
              <Input
                className="col-span-5 sm:col-span-3"
                type="number"
                min="0"
                step="0.01"
                leftAdornment="£"
                placeholder="Unit price"
                value={line.unit_price}
                onChange={e => setLine(i, { unit_price: e.target.value })}
                disabled={readOnly}
              />
              <div className="col-span-3 sm:col-span-1 flex items-center justify-end gap-1 h-[48px]">
                {!readOnly && lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label="Remove line"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1.5 ml-auto max-w-xs text-sm">
          <Row label="Subtotal" value={formatGBP(totals.subtotal)} />
          <Row label={`VAT (${Math.round(vatRate * 100)}%)`} value={formatGBP(totals.vatAmount)} />
          <Row label="Total" value={formatGBP(totals.total)} big />
        </div>
      </Card>

      {/* Scope + terms */}
      <div className="grid gap-3 md:grid-cols-2 mb-4">
        <TextArea label="Scope" rows={5} value={scope} onChange={e => setScope(e.target.value)} disabled={readOnly} placeholder="What's included" />
        <TextArea label="Terms" rows={5} value={terms} onChange={e => setTerms(e.target.value)} disabled={readOnly} placeholder="Payment terms, cancellation policy…" />
      </div>

      {/* Footer actions */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="secondary" onClick={() => save()} loading={saving} className="flex-1">
            {isNew ? 'Save draft' : 'Save changes'}
          </Button>
          <Button onClick={() => save('sent')} loading={saving} leftIcon={<Send className="w-4 h-4" />} className="flex-1">
            Save & mark as sent
          </Button>
        </div>
      )}
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
