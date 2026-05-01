import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Send, Clock, Wallet, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { DivisionDot } from '../components/ui/DivisionChip'
import { useQuotes } from '../hooks/useQuotes'
import { useClients } from '../hooks/useClients'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, formatGBP, statusLabel } from '../lib/utils'

// Map quote.status → Badge variant. We use slightly different palette
// than the global statusVariant() so the pipeline reads well at a glance.
function quoteBadgeVariant(status) {
  switch (status) {
    case 'accepted':  return 'success'
    case 'declined':  return 'danger'
    case 'expired':   return 'danger'
    case 'follow_up': return 'warning'
    case 'viewed':    return 'warning'
    case 'sent':      return 'primary'
    case 'draft':     return 'default'
    default:          return 'default'
  }
}

// Human-readable state label — slightly tweaked to match the Tree Mate
// pipeline view ("Tender · awaiting" reads better than "Follow up").
function quoteStateLabel(status) {
  switch (status) {
    case 'follow_up': return 'Tender · awaiting'
    default: return statusLabel(status)
  }
}

export default function Quotes() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  // No status filter — we show all and pivot via the table view
  const { quotes, loading, respondToQuote } = useQuotes({ divisionSlug })
  const { allClients } = useClients()
  const clientById = useMemo(() => {
    const m = new Map(); allClients.forEach(c => m.set(c.id, c)); return m
  }, [allClients])

  const [selectedId, setSelectedId] = useState(null)
  const [acceptingId, setAcceptingId] = useState(null)

  // Auto-select first quote on desktop so the detail panel is never empty
  useEffect(() => {
    if (selectedId == null && quotes.length > 0) setSelectedId(quotes[0].id)
  }, [quotes, selectedId])

  const selected = quotes.find(q => q.id === selectedId)

  // KPIs
  const totalPipeline = quotes
    .filter(q => ['sent', 'viewed', 'follow_up', 'accepted'].includes(q.status))
    .reduce((s, q) => s + (q.total || 0), 0)
  const outForReview = quotes.filter(q => ['sent', 'viewed'].includes(q.status)).length
  const followUps    = quotes.filter(q => q.status === 'follow_up').length

  const titleLine = quotes.length === 0
    ? 'No quotes yet'
    : `${quotes.length} quote${quotes.length === 1 ? '' : 's'}${totalPipeline > 0 ? ` · ${formatGBP(totalPipeline)} in pipeline` : ''}`

  async function handleAccept(quote) {
    if (!quote) return
    setAcceptingId(quote.id)
    try {
      await respondToQuote(quote.id, true)
      toast.success('Quote accepted', { description: 'It now appears under Accepted Quotes on the Jobs board.' })
    } catch (err) {
      toast.error('Could not accept quote', { description: err?.message })
    } finally {
      setAcceptingId(null)
    }
  }

  return (
    <PageWrapper size="full" className="!bg-slate-50 dark:!bg-gray-950">
      <div className="py-2">
        {/* Hero — eyebrow + dynamic title + new-quote button */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
              <FileText className="w-3.5 h-3.5" strokeWidth={2.5} />
              Sales pipeline
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="font-medium normal-case tracking-normal text-gray-500 dark:text-gray-400">
                {isGroupView ? 'All divisions' : currentDivision?.name}
              </span>
            </p>
            <h1 className="mt-1 text-2xl md:text-[26px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {titleLine}
            </h1>
          </div>
          <Button onClick={() => navigate('/quotes/new')} leftIcon={<Plus className="w-4 h-4" />} className="shrink-0">
            New quote
          </Button>
        </div>

        {/* Desktop KPI strip */}
        {!loading && quotes.length > 0 && (
          <div className="hidden md:grid grid-cols-3 gap-3 mb-5">
            <KpiTile label="Pipeline value" value={formatGBP(totalPipeline)} icon={Wallet} highlight />
            <KpiTile label="Out for review" value={outForReview} icon={Send} />
            <KpiTile label="Follow-ups due" value={followUps} icon={Clock} amber={followUps > 0} />
          </div>
        )}

        {/* Mobile KPI strip — 2-up */}
        {!loading && quotes.length > 0 && (
          <div className="md:hidden grid grid-cols-2 gap-3 mb-4">
            <KpiTile label="Pipeline value" value={formatGBP(totalPipeline)} icon={Wallet} highlight compact />
            <KpiTile label="Out for review" value={outForReview} icon={Send} compact />
          </div>
        )}

        {loading ? (
          <SkeletonList count={5} />
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotes yet"
            description="Draft your first quote — they show up here grouped by pipeline stage."
            action={<Button onClick={() => navigate('/quotes/new')} leftIcon={<Plus className="w-4 h-4" />}>New quote</Button>}
          />
        ) : (
          <>
            {/* Mobile: stacked card list */}
            <div className="md:hidden space-y-2">
              {quotes.map(q => (
                <Card key={q.id} onClick={() => navigate(`/quotes/${q.id}`)} className="!p-4">
                  <div className="flex items-start gap-3">
                    <DivisionDot slug={q.division_slug} className="mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{clientById.get(q.client_id)?.name || 'Unknown'}</p>
                        <Badge variant={quoteBadgeVariant(q.status)} className="shrink-0">{quoteStateLabel(q.status)}</Badge>
                      </div>
                      {q.subject && <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mb-1.5">{q.subject}</p>}
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                          {q.quote_number ? <span className="font-mono">{q.quote_number}</span> : null}
                          {q.quote_number && q.created_at ? ' · ' : null}
                          {q.created_at ? formatDate(q.created_at) : null}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatGBP(q.total || 0)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop: master-detail */}
            <div className="hidden md:grid md:grid-cols-12 gap-4">
              {/* Pipeline table */}
              <div className="md:col-span-7 xl:col-span-7 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  <div className="col-span-2">Ref</div>
                  <div className="col-span-5">Client / Work</div>
                  <div className="col-span-3">State</div>
                  <div className="col-span-2 text-right">Value</div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {quotes.map(q => {
                    const isSelected = selectedId === q.id
                    const ref = q.quote_number || `AW-${String(q.id).replace(/-/g, '').slice(0, 4).toUpperCase()}`
                    const work = q.subject || 'Quote'
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedId(q.id)}
                        className={cn(
                          'grid grid-cols-12 w-full text-left px-4 py-3 items-center transition-colors',
                          isSelected ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                        )}
                      >
                        <div className="col-span-2 inline-flex items-center gap-1.5 text-[11px] font-semibold tabular-nums tracking-wider text-brand-600 dark:text-brand-400 min-w-0">
                          <DivisionDot slug={q.division_slug} />
                          <span className="truncate">{ref}</span>
                        </div>
                        <div className="col-span-5 min-w-0">
                          <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{clientById.get(q.client_id)?.name || 'Unknown'}</div>
                          <div className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">{work}</div>
                        </div>
                        <div className="col-span-3">
                          <Badge variant={quoteBadgeVariant(q.status)}>{quoteStateLabel(q.status)}</Badge>
                        </div>
                        <div className="col-span-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-right">
                          {formatGBP(q.total || 0)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detail panel */}
              <div className="md:col-span-5 xl:col-span-5">
                {selected ? (
                  <QuoteDetail
                    quote={selected}
                    client={clientById.get(selected.client_id)}
                    navigate={navigate}
                    onAccept={() => handleAccept(selected)}
                    accepting={acceptingId === selected.id}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Select a quote to view details
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  )
}

// ─── Detail panel ──────────────────────────────────────
function QuoteDetail({ quote, client, navigate, onAccept, accepting }) {
  const ref = quote.quote_number || `AW-${String(quote.id).replace(/-/g, '').slice(0, 4).toUpperCase()}`
  const lineItems = Array.isArray(quote.line_items) ? quote.line_items : []
  const canAccept = !['accepted', 'declined', 'expired'].includes(quote.status)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card p-5 sticky top-24">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tabular-nums tracking-wider text-brand-600 dark:text-brand-400 mb-1">
            <DivisionDot slug={quote.division_slug} />
            {ref}
          </div>
          <h2 className="text-[18px] font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">
            {client?.name || 'Unknown'}
          </h2>
          {quote.subject && (
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{quote.subject}</p>
          )}
        </div>
        <Badge variant={quoteBadgeVariant(quote.status)}>{quoteStateLabel(quote.status)}</Badge>
      </div>

      {/* Meta grid: created / expires */}
      {(quote.created_at || quote.expires_at) && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-y border-gray-100 dark:border-gray-800 my-3">
          {quote.created_at && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Created</div>
              <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{formatDate(quote.created_at)}</div>
            </div>
          )}
          {quote.expires_at && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Expires</div>
              <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{formatDate(quote.expires_at)}</div>
            </div>
          )}
        </div>
      )}

      {/* Line items */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 mb-2">Line items</div>
        {lineItems.length === 0 ? (
          <div className="flex items-center justify-between text-[12.5px] py-1">
            <span className="text-gray-400 dark:text-gray-500">—</span>
            <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100">{formatGBP(0)}</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {lineItems.map((it, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-[12.5px]">
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-3">{it.description || '—'}</span>
                <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                  {formatGBP((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Total</div>
        <div className="text-[22px] font-bold tabular-nums tracking-tight text-brand-600 dark:text-brand-400">
          {formatGBP(quote.total || 0)}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <button
          onClick={() => navigate(`/quotes/${quote.id}`)}
          className="text-xs font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          Open quote <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
        {canAccept && onAccept && (
          <button
            onClick={onAccept}
            disabled={accepting}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-brand-600 text-white shadow-button hover:bg-brand-700 disabled:opacity-60 disabled:cursor-wait transition-colors"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            {accepting ? 'Accepting…' : 'Mark accepted'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── KPI tile ──────────────────────────────────────────
function KpiTile({ label, value, icon: Icon, highlight, amber, compact }) {
  const labelTone = highlight
    ? 'text-brand-700 dark:text-brand-300'
    : 'text-gray-500 dark:text-gray-400'
  const valueTone = amber
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-900 dark:text-gray-100'
  const iconWrap = highlight
    ? 'bg-brand-100/70 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
    : amber
      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
      : 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
  const wrap = highlight
    ? 'rounded-2xl border border-brand-200/60 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-950/20 shadow-card'
    : 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-card'
  return (
    <div className={cn(wrap, compact ? 'p-3.5' : 'p-4')}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold uppercase tracking-wider', labelTone, compact ? 'text-[10px]' : 'text-xs')}>
            {label}
          </p>
          <p className={cn('mt-1.5 font-bold tabular-nums leading-none', valueTone, compact ? 'text-xl' : 'mt-2 text-2xl sm:text-3xl')}>
            {value}
          </p>
        </div>
        <div className={cn(
          'rounded-lg flex items-center justify-center shrink-0',
          iconWrap,
          compact ? 'w-8 h-8' : 'w-10 h-10 rounded-xl',
        )}>
          <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
