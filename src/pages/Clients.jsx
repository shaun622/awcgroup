import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Search, Briefcase, Wallet, ArrowRight, ChevronRight, Phone, Mail, MapPin } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import AddClientModal from '../components/ui/AddClientModal'
import { useClients } from '../hooks/useClients'
import { useBusiness } from '../contexts/BusinessContext'
import { supabase } from '../lib/supabase'
import { cn, formatGBP, formatRelative, statusLabel, statusVariant } from '../lib/utils'

// Active job statuses we count toward the "Active jobs" KPI
const ACTIVE_JOB_STATUSES = new Set(['scheduled', 'in_progress', 'on_hold'])
// Invoice statuses that count toward YTD spend (matches the existing
// invoices schema across the FieldSuite family).
const PAID_INVOICE_STATUSES = new Set(['paid'])

export default function Clients() {
  const navigate = useNavigate()
  const { business } = useBusiness()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const { clients, loading, allClients, addClient } = useClients({ search })

  // Per-client roll-ups: premises (sites), jobs, invoices. We fetch these
  // once at page load and group client-side rather than running three
  // queries per client. Numbers refresh whenever the business or the
  // clients list changes (e.g. after a new client is added).
  const [premisesByClient, setPremisesByClient] = useState({})
  const [jobsByClient, setJobsByClient] = useState({})
  const [invoicesByClient, setInvoicesByClient] = useState({})

  useEffect(() => {
    if (!business?.id) return
    let cancelled = false
    Promise.all([
      supabase.from('premises').select('id, client_id').eq('business_id', business.id),
      supabase.from('jobs').select('id, client_id, status, created_at').eq('business_id', business.id),
      supabase.from('invoices').select('id, client_id, total, status, created_at').eq('business_id', business.id),
    ]).then(([prRes, jbRes, invRes]) => {
      if (cancelled) return
      const groupBy = (rows) => {
        const m = {}
        for (const r of rows ?? []) {
          if (!r.client_id) continue
          if (!m[r.client_id]) m[r.client_id] = []
          m[r.client_id].push(r)
        }
        return m
      }
      setPremisesByClient(groupBy(prRes.data))
      setJobsByClient(groupBy(jbRes.data))
      setInvoicesByClient(groupBy(invRes.data))
    })
    return () => { cancelled = true }
  }, [business?.id, allClients.length])

  // ── KPIs ───────────────────────────────────────────────
  const yearStart = useMemo(() => {
    const d = new Date()
    d.setMonth(0, 1); d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const totalClients = allClients.length
  const activeJobsTotal = useMemo(() => {
    let n = 0
    for (const list of Object.values(jobsByClient)) {
      n += list.filter(j => ACTIVE_JOB_STATUSES.has(j.status)).length
    }
    return n
  }, [jobsByClient])
  const ytdRevenue = useMemo(() => {
    let sum = 0
    for (const list of Object.values(invoicesByClient)) {
      for (const inv of list) {
        if (!PAID_INVOICE_STATUSES.has(inv.status)) continue
        if (new Date(inv.created_at) < yearStart) continue
        sum += inv.total || 0
      }
    }
    return sum
  }, [invoicesByClient, yearStart])

  // ── Derived per-client metrics ─────────────────────────
  const ytdByClient = useMemo(() => {
    const m = {}
    for (const [cid, list] of Object.entries(invoicesByClient)) {
      let sum = 0
      for (const inv of list) {
        if (!PAID_INVOICE_STATUSES.has(inv.status)) continue
        if (new Date(inv.created_at) < yearStart) continue
        sum += inv.total || 0
      }
      m[cid] = sum
    }
    return m
  }, [invoicesByClient, yearStart])

  // Auto-select the first visible client on desktop so the detail panel
  // is never empty when there are clients to show.
  useEffect(() => {
    if (selectedId == null && clients.length > 0) setSelectedId(clients[0].id)
  }, [clients, selectedId])

  const selected = allClients.find(c => c.id === selectedId)
  const selectedJobs = (selected && jobsByClient[selected.id]) || []
  const selectedSites = (selected && premisesByClient[selected.id]?.length) || 0
  const selectedYtd = (selected && ytdByClient[selected.id]) || 0

  return (
    <PageWrapper size="full" className="!bg-slate-50 dark:!bg-gray-950">
      <div className="py-2">
        {/* Hero — eyebrow + title + add-client */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
              <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
              CRM
            </p>
            <h1 className="mt-1 text-2xl md:text-[26px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {totalClients} {totalClients === 1 ? 'client' : 'clients'}
              {totalClients > 0 && (
                <span className="text-gray-400 dark:text-gray-500 font-normal text-base ml-2">· shared across all divisions</span>
              )}
            </h1>
          </div>
          <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="shrink-0">
            Add client
          </Button>
        </div>

        {/* KPI strip — desktop only */}
        <div className="hidden md:grid grid-cols-3 gap-3 mb-5">
          <KpiTile label="Total clients" value={totalClients} icon={Users} />
          <KpiTile label="Active jobs" value={activeJobsTotal} icon={Briefcase} />
          <KpiTile label="YTD revenue" value={formatGBP(ytdRevenue)} icon={Wallet} highlight />
        </div>

        {/* Mobile KPI strip — 2-up, drops Total clients (already in title) */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-4">
          <KpiTile label="Active jobs" value={activeJobsTotal} icon={Briefcase} compact />
          <KpiTile label="YTD revenue" value={formatGBP(ytdRevenue)} icon={Wallet} highlight compact />
        </div>

        {/* Mobile — search + list */}
        <div className="md:hidden space-y-4">
          {allClients.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search by name, email, phone, postcode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                style={{ fontSize: '16px' }}
              />
            </div>
          )}

          {loading && allClients.length === 0 ? (
            <SkeletonList count={3} />
          ) : allClients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start tracking premises, quotes and jobs across any division."
              action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Add your first client</Button>}
            />
          ) : clients.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">No matches for "{search}"</div>
          ) : (
            <div className="space-y-2">
              {clients.map(client => (
                <Card key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="!p-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar name={client.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">{client.name}</p>
                        <Badge variant={statusVariant(client.pipeline_stage)} className="shrink-0">
                          {statusLabel(client.pipeline_stage)}
                        </Badge>
                      </div>
                      <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5">{statusLabel(client.client_type)}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                        {client.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>}
                        {client.email && <span className="inline-flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {client.email}</span>}
                        {(client.city || client.postcode) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[client.city, client.postcode].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" strokeWidth={2} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Desktop master-detail */}
        {allClients.length > 0 && (
          <div className="hidden md:grid md:grid-cols-12 gap-4">
            {/* Left: search + table */}
            <div className="md:col-span-7 xl:col-span-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent border-0 outline-none flex-1 text-[13px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div className="grid grid-cols-12 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                <div className="col-span-5">Client</div>
                <div className="col-span-3">Type</div>
                <div className="col-span-1 text-right">Sites</div>
                <div className="col-span-3 text-right">YTD spend</div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {clients.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No clients match your search</div>
                ) : clients.map(client => {
                  const sites = premisesByClient[client.id]?.length || 0
                  const ytd = ytdByClient[client.id] || 0
                  const isSelected = selectedId === client.id
                  const isHot = ['active', 'quoted'].includes(client.pipeline_stage)
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedId(client.id)}
                      className={cn(
                        'grid grid-cols-12 w-full text-left px-4 py-3 items-center transition-colors',
                        isSelected ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      )}
                    >
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        {isHot && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                        <span className="text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 truncate">{client.name}</span>
                      </div>
                      <div className="col-span-3 text-[12.5px] text-gray-500 dark:text-gray-400 truncate">{statusLabel(client.client_type)}</div>
                      <div className="col-span-1 text-[12.5px] text-gray-700 dark:text-gray-300 tabular-nums text-right">{sites || '—'}</div>
                      <div className="col-span-3 text-[12.5px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-right">{ytd > 0 ? formatGBP(ytd) : '—'}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right: detail panel */}
            <div className="md:col-span-5 xl:col-span-4">
              {selected ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card p-5 sticky top-24">
                  <div className="flex items-start justify-between mb-3">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                      <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Client detail
                    </p>
                    <Badge variant={statusVariant(selected.pipeline_stage)}>
                      {statusLabel(selected.pipeline_stage)}
                    </Badge>
                  </div>
                  <h2 className="text-[20px] font-bold tracking-tight text-gray-900 dark:text-gray-100">{selected.name}</h2>
                  <p className="text-[12.5px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {selected.email || selected.phone || '—'}
                  </p>
                  {(selected.city || selected.postcode) && (
                    <p className="text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                      {[selected.address_line_1, selected.city, selected.postcode].filter(Boolean).join(', ')}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Sites</div>
                      <div className="text-[20px] font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-1">
                        {selectedSites}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">YTD spend</div>
                      <div className="text-[20px] font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-1">
                        {formatGBP(selectedYtd)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3">
                    <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 mb-2">
                      <Briefcase className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Recent jobs
                    </p>
                    <div className="space-y-1.5">
                      {selectedJobs.slice(0, 4).map(j => (
                        <div key={j.id} className="flex items-center justify-between text-[12px]">
                          <span className="text-gray-700 dark:text-gray-300 truncate">Job · {statusLabel(j.status)}</span>
                          <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                            {j.created_at ? new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                          </span>
                        </div>
                      ))}
                      {selectedJobs.length === 0 && (
                        <div className="text-[12px] text-gray-400 dark:text-gray-500 italic">No jobs yet</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => navigate(`/clients/${selected.id}`)}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 hover:gap-1.5 transition-all"
                    >
                      Open profile <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Select a client to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop empty state — when no clients at all */}
        {allClients.length === 0 && !loading && (
          <div className="hidden md:block">
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start tracking premises, quotes and jobs across any division."
              action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Add your first client</Button>}
            />
          </div>
        )}
      </div>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} addClient={addClient} />
    </PageWrapper>
  )
}

// ─── KPI tile ──────────────────────────────────────────
// `highlight` swaps to the brand-tinted card style (used for the YTD
// revenue tile to give one element visual prominence).
function KpiTile({ label, value, icon: Icon, highlight, compact }) {
  if (highlight) {
    return (
      <div className={cn(
        'rounded-2xl border border-brand-200/60 dark:border-brand-800/40 bg-brand-50/50 dark:bg-brand-950/20 shadow-card',
        compact ? 'p-3.5' : 'p-4',
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn('font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300', compact ? 'text-[10px]' : 'text-xs')}>
              {label}
            </p>
            <p className={cn('mt-1.5 font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none', compact ? 'text-xl' : 'mt-2 text-2xl sm:text-3xl')}>
              {value}
            </p>
          </div>
          <div className={cn(
            'rounded-lg flex items-center justify-center shrink-0 bg-brand-100/70 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
            compact ? 'w-8 h-8' : 'w-10 h-10 rounded-xl',
          )}>
            <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} strokeWidth={2} />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={cn(
      'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-card',
      compact ? 'p-3.5' : 'p-4',
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400', compact ? 'text-[10px]' : 'text-xs')}>
            {label}
          </p>
          <p className={cn('mt-1.5 font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none', compact ? 'text-xl' : 'mt-2 text-2xl sm:text-3xl')}>
            {value}
          </p>
        </div>
        <div className={cn(
          'rounded-lg flex items-center justify-center shrink-0 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
          compact ? 'w-8 h-8' : 'w-10 h-10 rounded-xl',
        )}>
          <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
