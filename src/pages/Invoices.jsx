import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Plus, Wallet, Clock, AlertTriangle, Download } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { DivisionDot } from '../components/ui/DivisionChip'
import { useInvoices } from '../hooks/useInvoices'
import { useClients } from '../hooks/useClients'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, formatGBP, statusLabel } from '../lib/utils'

// "Paid"/"Outstanding"/"Overdue" derive from status + due_date — we
// don't store an explicit "overdue" status. A `sent` invoice past its
// due_date is overdue; a paid invoice in the current month is "paid in {month}".
const PAID_STATUS = 'paid'
const SENT_STATUS = 'sent'

function isOverdue(inv, todayIso) {
  return inv.status === SENT_STATUS && inv.due_date && inv.due_date < todayIso
}

function daysSince(iso) {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

export default function Invoices() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const { invoices, loading } = useInvoices({ divisionSlug })
  const { allClients } = useClients()
  const clientById = useMemo(() => {
    const m = new Map(); allClients.forEach(c => m.set(c.id, c)); return m
  }, [allClients])

  // ── KPIs ───────────────────────────────────────────────
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const monthName = today.toLocaleDateString('en-GB', { month: 'long' })
  const monthStart = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1)
    return d.toISOString().slice(0, 10)
  }, [today.getMonth(), today.getFullYear()])

  const paidThisMonth = invoices
    .filter(i => i.status === PAID_STATUS && i.paid_at && i.paid_at.slice(0, 10) >= monthStart)
    .reduce((s, i) => s + (i.total || 0), 0)
  const outstanding = invoices
    .filter(i => i.status === SENT_STATUS && (!i.due_date || i.due_date >= todayIso))
    .reduce((s, i) => s + (i.total || 0), 0)
  const overdueInvoices = invoices.filter(i => isOverdue(i, todayIso))
  const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.total || 0), 0)
  const overdueCount = overdueInvoices.length

  const titleLine = invoices.length === 0
    ? 'No invoices yet'
    : `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} · ${monthName}`

  // CSV export of the visible list — division context drives what's
  // visible, so an export from "Pest" exports just Pest invoices, and
  // group view exports everything. One row per invoice (header data).
  // Numbers exported raw (no currency symbol) so accounting software
  // can sum them without strip-and-parse.
  const csvCell = (v) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  function exportCsv() {
    const header = [
      'Invoice number', 'Division', 'Client', 'Status',
      'Issue date', 'Due date', 'Paid date',
      'Subtotal (GBP)', 'VAT (GBP)', 'VAT rate', 'Total (GBP)',
    ]
    const rows = invoices.map(inv => {
      const client = clientById.get(inv.client_id)
      const overdue = isOverdue(inv, todayIso)
      return [
        inv.invoice_number || '',
        inv.division_slug || '',
        client?.name || '',
        overdue ? `Overdue (${daysSince(inv.due_date)}d)` : statusLabel(inv.status),
        inv.issue_date || '',
        inv.due_date || '',
        inv.paid_at ? String(inv.paid_at).slice(0, 10) : '',
        Number(inv.subtotal || 0).toFixed(2),
        Number(inv.vat_amount || 0).toFixed(2),
        inv.vat_rate != null ? `${(Number(inv.vat_rate) * 100).toFixed(2)}%` : '',
        Number(inv.total || 0).toFixed(2),
      ]
    })
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
    // UTF-8 BOM for Excel-friendly opening with non-ASCII names.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const today = new Date().toISOString().slice(0, 10)
    const scope = isGroupView ? 'all' : (currentDivision?.slug || 'all')
    a.download = `awc-invoices-${scope}-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageWrapper size="full" className="!bg-slate-50 dark:!bg-gray-950">
      <div className="py-2">
        {/* Hero — eyebrow + dynamic title + new-invoice */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
              <Receipt className="w-3.5 h-3.5" strokeWidth={2.5} />
              Billing
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="font-medium normal-case tracking-normal text-gray-500 dark:text-gray-400">
                {isGroupView ? 'All divisions' : currentDivision?.name}
              </span>
            </p>
            <h1 className="mt-1 text-2xl md:text-[26px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {titleLine}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {invoices.length > 0 && (
              <Button onClick={exportCsv} leftIcon={<Download className="w-4 h-4" />} variant="secondary">
                Export
              </Button>
            )}
            <Button onClick={() => navigate('/invoices/new')} leftIcon={<Plus className="w-4 h-4" />}>
              New invoice
            </Button>
          </div>
        </div>

        {/* Desktop KPI strip */}
        {!loading && invoices.length > 0 && (
          <div className="hidden md:grid grid-cols-3 gap-3 mb-5">
            <KpiTile label={`Paid in ${monthName}`} value={formatGBP(paidThisMonth)} icon={Wallet} highlight />
            <KpiTile label="Outstanding" value={formatGBP(outstanding)} icon={Clock} />
            <KpiTile
              label="Overdue"
              value={formatGBP(overdueTotal)}
              icon={AlertTriangle}
              danger={overdueCount > 0}
              footer={overdueCount > 0 ? `${overdueCount} invoice${overdueCount === 1 ? '' : 's'} chasing` : null}
            />
          </div>
        )}

        {/* Mobile KPI strip — 2-up + overdue full-width below if any */}
        {!loading && invoices.length > 0 && (
          <div className="md:hidden space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <KpiTile label={`Paid in ${monthName}`} value={formatGBP(paidThisMonth)} icon={Wallet} highlight compact />
              <KpiTile label="Outstanding" value={formatGBP(outstanding)} icon={Clock} compact />
            </div>
            {overdueCount > 0 && (
              <KpiTile
                label="Overdue"
                value={formatGBP(overdueTotal)}
                icon={AlertTriangle}
                danger
                compact
                footer={`${overdueCount} invoice${overdueCount === 1 ? '' : 's'} chasing`}
              />
            )}
          </div>
        )}

        {loading ? (
          <SkeletonList count={3} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Create your first invoice — from a completed job, an accepted quote, or a blank slate."
            action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/invoices/new')}>New invoice</Button>}
          />
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-2">
              {invoices.map(inv => {
                const client = clientById.get(inv.client_id)
                const overdue = isOverdue(inv, todayIso)
                return (
                  <button
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="block w-full text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <DivisionDot slug={inv.division_slug} className="mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-mono text-[11px] font-semibold tabular-nums tracking-wider text-brand-600 dark:text-brand-400">
                            {inv.invoice_number}
                          </p>
                          {overdue ? (
                            <Badge variant="danger" className="shrink-0">Overdue · {daysSince(inv.due_date)}d</Badge>
                          ) : (
                            <Badge variant={inv.status === PAID_STATUS ? 'success' : inv.status === 'sent' ? 'primary' : 'default'} className="shrink-0">
                              {statusLabel(inv.status)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 truncate">{client?.name ?? '—'}</p>
                        <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-gray-500 dark:text-gray-400">
                          <span>Due {formatDate(inv.due_date)}</span>
                          <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatGBP(inv.total)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Desktop: single-card table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                <div className="col-span-2">Ref</div>
                <div className="col-span-4">Client</div>
                <div className="col-span-2 text-right">Value</div>
                <div className="col-span-2">State</div>
                <div className="col-span-2 text-right">Paid</div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoices.map(inv => {
                  const client = clientById.get(inv.client_id)
                  const overdue = isOverdue(inv, todayIso)
                  return (
                    <button
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="grid grid-cols-12 w-full text-left px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="col-span-2 inline-flex items-center gap-1.5 min-w-0">
                        <DivisionDot slug={inv.division_slug} />
                        <span className="font-mono text-[11px] font-semibold tabular-nums tracking-wider text-brand-600 dark:text-brand-400 truncate">
                          {inv.invoice_number}
                        </span>
                      </div>
                      <div className="col-span-4 text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {client?.name ?? '—'}
                      </div>
                      <div className="col-span-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-right">
                        {formatGBP(inv.total)}
                      </div>
                      <div className="col-span-2">
                        {overdue ? (
                          <Badge variant="danger">Overdue · {daysSince(inv.due_date)}d</Badge>
                        ) : (
                          <Badge variant={inv.status === PAID_STATUS ? 'success' : inv.status === 'sent' ? 'primary' : 'default'}>
                            {statusLabel(inv.status)}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-2 text-[12px] tabular-nums text-right">
                        {inv.paid_at ? (
                          <span className="text-gray-700 dark:text-gray-300 font-semibold">{formatDate(inv.paid_at)}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">—</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  )
}

// ─── KPI tile ──────────────────────────────────────────
// `highlight` paints brand-tinted; `danger` paints red-tinted (used for
// overdue when count > 0). `footer` shows a subline like "1 invoice chasing".
function KpiTile({ label, value, icon: Icon, highlight, danger, footer, compact }) {
  const wrap = danger
    ? 'rounded-2xl border border-red-200/70 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 shadow-card'
    : highlight
      ? 'rounded-2xl border border-brand-200/60 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-950/20 shadow-card'
      : 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-card'
  const labelTone = danger
    ? 'text-red-700 dark:text-red-300'
    : highlight
      ? 'text-brand-700 dark:text-brand-300'
      : 'text-gray-500 dark:text-gray-400'
  const valueTone = danger
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-900 dark:text-gray-100'
  const iconWrap = danger
    ? 'bg-red-100/70 text-red-600 dark:bg-red-900/40 dark:text-red-400'
    : highlight
      ? 'bg-brand-100/70 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
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
          {footer && (
            <p className={cn('mt-1 text-[11px] font-medium', danger ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')}>
              {footer}
            </p>
          )}
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
