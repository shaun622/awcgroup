import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Plus, CalendarClock, LayoutGrid, List as ListIcon, Pause, Receipt, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { DivisionDot } from '../components/ui/DivisionChip'
import NewJobModal from '../components/ui/NewJobModal'
import FilterChips from '../components/ui/FilterChips'
import { useJobs } from '../hooks/useJobs'
import { useQuotes } from '../hooks/useQuotes'
import { useClients } from '../hooks/useClients'
import { usePremises } from '../hooks/usePremises'
import { useStaff } from '../hooks/useStaff'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, formatTime, statusLabel, statusVariant, formatGBP, JOB_STATUSES } from '../lib/utils'

// List-view filter chips (used when viewMode === 'list')
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  ...JOB_STATUSES.map(s => ({ value: s, label: statusLabel(s) })),
]

// Job ref shown on every card. AWC has no business-prefix yet — use the
// first 4 chars of the UUID, uppercased, prefixed with the division slug
// initials so cards are unambiguous in Group view.
function jobRef(job) {
  const id = String(job.id || '').replace(/-/g, '').slice(0, 4).toUpperCase()
  const div = (job.division_slug || '').split(/[_-]/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AW'
  return `${div}-${id}`
}
function quoteRef(quote) {
  const id = String(quote.id || '').replace(/-/g, '').slice(0, 4).toUpperCase()
  const div = (quote.division_slug || '').split(/[_-]/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AW'
  return `${div}-Q${id}`
}

function ageDays(iso) {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return '0d'
  return `${days}d`
}

export default function Jobs() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const [viewMode, setViewMode] = useState('pipeline') // 'pipeline' | 'list'
  const [statusFilter, setStatusFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)

  // Always pull all jobs for the current division scope; we filter
  // client-side for the list view and bucket by status for the board.
  const { jobs, loading, createJob } = useJobs({ divisionSlug })
  const { quotes: acceptedQuotes } = useQuotes({ divisionSlug, status: 'accepted' })
  const { allClients } = useClients()
  const { premises } = usePremises({ divisionSlug })
  const { staff } = useStaff({ divisionSlug })

  const clientById = useMemo(() => {
    const m = new Map(); allClients.forEach(c => m.set(c.id, c)); return m
  }, [allClients])
  const premisesById = useMemo(() => {
    const m = new Map(); premises.forEach(p => m.set(p.id, p)); return m
  }, [premises])
  const staffById = useMemo(() => {
    const m = new Map(); staff.forEach(s => m.set(s.id, s)); return m
  }, [staff])

  // Hide accepted quotes that already have a job created from them.
  // jobs.quote_id is the FK; if it's missing in the schema this is a no-op.
  const usedQuoteIds = useMemo(() => {
    const s = new Set()
    for (const j of jobs) if (j.quote_id) s.add(j.quote_id)
    return s
  }, [jobs])
  const openAcceptedQuotes = useMemo(
    () => (acceptedQuotes || []).filter(q => !usedQuoteIds.has(q.id)),
    [acceptedQuotes, usedQuoteIds],
  )

  // Filter applied for the list view
  const filteredJobs = useMemo(() => {
    if (statusFilter === 'all') return jobs
    return jobs.filter(j => j.status === statusFilter)
  }, [jobs, statusFilter])

  // KPIs for the title line
  const activeCount = jobs.filter(j => !['completed', 'cancelled'].includes(j.status)).length
  const distinctClients = new Set(jobs.map(j => j.client_id).filter(Boolean)).size
  const titleLine = jobs.length === 0
    ? 'No jobs yet'
    : `${activeCount} active across ${distinctClients} client${distinctClients === 1 ? '' : 's'}`

  const scopeLabel = isGroupView ? 'All divisions' : currentDivision?.name

  return (
    <PageWrapper size="full" className="!bg-slate-50 dark:!bg-gray-950">
      <div className="py-2">
        {/* Hero — eyebrow + dynamic title + controls */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
              <Briefcase className="w-3.5 h-3.5" strokeWidth={2.5} />
              Jobs board
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="font-medium normal-case tracking-normal text-gray-500 dark:text-gray-400">
                {scopeLabel}
              </span>
            </p>
            <h1 className="mt-1 text-2xl md:text-[26px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {titleLine}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'pipeline' : 'list')}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle view"
            >
              {viewMode === 'pipeline'
                ? <><ListIcon className="w-3.5 h-3.5" strokeWidth={2.5} /> List</>
                : <><LayoutGrid className="w-3.5 h-3.5" strokeWidth={2.5} /> Board</>}
            </button>
            <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              New job
            </Button>
          </div>
        </div>

        {viewMode === 'list' && (
          <FilterChips
            className="mb-4"
            options={STATUS_FILTERS.map(f => ({
              value: f.value,
              label: f.label,
              count: f.value === 'all' ? jobs.length : jobs.filter(j => j.status === f.value).length,
            }))}
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Job status filter"
          />
        )}

        {loading && jobs.length === 0 ? (
          <SkeletonList count={3} />
        ) : jobs.length === 0 && openAcceptedQuotes.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs yet"
            description="Schedule your first job to get things moving."
            action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Schedule a job</Button>}
          />
        ) : viewMode === 'pipeline' ? (
          <PipelineView
            jobs={jobs}
            acceptedQuotes={openAcceptedQuotes}
            clientById={clientById}
            premisesById={premisesById}
            onOpenJob={(j) => navigate(`/jobs/${j.id}`)}
            onOpenQuote={(q) => navigate(`/quotes/${q.id}`)}
          />
        ) : (
          <ListView
            jobs={filteredJobs}
            clientById={clientById}
            premisesById={premisesById}
            staffById={staffById}
            onOpenJob={(j) => navigate(`/jobs/${j.id}`)}
            statusFilter={statusFilter}
            onAdd={() => setAddOpen(true)}
          />
        )}
      </div>

      <NewJobModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        createJob={createJob}
        onCreated={j => navigate(`/jobs/${j.id}`)}
      />
    </PageWrapper>
  )
}

// ─── Pipeline (kanban) view ───────────────────────────
// Four columns: Accepted Quotes (not yet converted) → Scheduled → In progress → Completed.
// On-hold jobs surface inside the In progress column with a small "On hold" pill.
// Cancelled jobs are hidden from the board — toggle to list view to see them.
function PipelineView({ jobs, acceptedQuotes, clientById, premisesById, onOpenJob, onOpenQuote }) {
  const scheduled  = jobs.filter(j => j.status === 'scheduled')
  const inProgress = jobs.filter(j => j.status === 'in_progress' || j.status === 'on_hold')
  const completed  = jobs.filter(j => j.status === 'completed')

  const columns = [
    { key: 'quoted',    label: 'Accepted quotes', count: acceptedQuotes.length, items: acceptedQuotes, kind: 'quote' },
    { key: 'scheduled', label: 'Scheduled',       count: scheduled.length,      items: scheduled,      kind: 'job' },
    { key: 'progress',  label: 'In progress',     count: inProgress.length,     items: inProgress,     kind: 'job', tinted: true },
    { key: 'done',      label: 'Done · awaiting invoice', count: completed.length, items: completed, kind: 'job' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map(col => (
        <div key={col.key} className="min-h-[280px]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800 mb-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              {col.label}
            </p>
            <span className="text-[11px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">{col.count}</span>
          </div>
          <div className="space-y-2">
            {col.items.length === 0 ? (
              <div className="text-[11px] text-gray-400 dark:text-gray-600 italic px-1 py-2">—</div>
            ) : col.kind === 'quote' ? (
              col.items.map(quote => (
                <PipelineCard
                  key={quote.id}
                  refCode={quoteRef(quote)}
                  title={quote.title || 'Quote'}
                  clientName={clientById.get(quote.client_id)?.name || '—'}
                  divisionSlug={quote.division_slug}
                  primary={quote.total != null ? formatGBP(quote.total) : null}
                  secondary={ageDays(quote.created_at)}
                  onClick={() => onOpenQuote(quote)}
                />
              ))
            ) : (
              col.items.map(job => {
                const sched = job.scheduled_date ? new Date(job.scheduled_date) : null
                const primary = sched
                  ? sched.toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' + formatTime(job.scheduled_date)
                  : (job.price != null ? formatGBP(job.price) : null)
                return (
                  <PipelineCard
                    key={job.id}
                    refCode={jobRef(job)}
                    title={job.title || 'Job'}
                    clientName={clientById.get(job.client_id)?.name || '—'}
                    divisionSlug={job.division_slug}
                    primary={primary}
                    secondary={ageDays(job.created_at)}
                    tinted={col.tinted}
                    onHold={job.status === 'on_hold'}
                    onClick={() => onOpenJob(job)}
                    // On the "Done · awaiting invoice" column, surface
                    // a one-click invoice shortcut that goes straight
                    // to InvoiceBuilder pre-filled from the job (the
                    // builder already handles ?from=job:ID).
                    invoiceHref={col.key === 'done' ? `/invoices/new?from=job:${job.id}` : null}
                  />
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function PipelineCard({ refCode, title, clientName, divisionSlug, primary, secondary, tinted, onHold, onClick, invoiceHref }) {
  // Use a div+role=button instead of <button> so we can nest a Link
  // for the optional invoice shortcut without invalid HTML (button-in-
  // button). Stop-propagation on the Link prevents the outer card
  // click from firing.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() }}
      className={cn(
        'w-full text-left rounded-2xl border p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer',
        tinted
          ? 'bg-brand-50/60 border-brand-200/60 dark:bg-brand-950/30 dark:border-brand-800/40'
          : 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tabular-nums tracking-wider text-brand-600 dark:text-brand-400">
          <DivisionDot slug={divisionSlug} />
          {refCode}
        </span>
        {onHold && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full">
            <Pause className="w-2.5 h-2.5" strokeWidth={2.5} />
            On hold
          </span>
        )}
      </div>
      <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-1 truncate">
        {title}
      </p>
      <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mb-2 truncate">{clientName}</p>
      <div className="flex items-center justify-between text-[10.5px] tabular-nums text-gray-500 dark:text-gray-400">
        <span className="text-gray-700 dark:text-gray-300 font-semibold truncate">
          {primary || '—'}
        </span>
        <span className="shrink-0 ml-2">{secondary}</span>
      </div>
      {invoiceHref && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Link
            to={invoiceHref}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-700 dark:text-brand-300 hover:gap-1.5 transition-all"
          >
            <Receipt className="w-3 h-3" strokeWidth={2.5} />
            Create invoice <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── List view (the original AWC layout) ──────────────
function ListView({ jobs, clientById, premisesById, staffById, onOpenJob, statusFilter, onAdd }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title={statusFilter === 'all' ? 'No jobs yet' : `No ${statusLabel(statusFilter).toLowerCase()} jobs`}
        description={statusFilter === 'all'
          ? 'Schedule your first job to get things moving.'
          : `Nothing in the ${statusLabel(statusFilter).toLowerCase()} pile right now.`}
        action={statusFilter === 'all' && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={onAdd}>
            Schedule a job
          </Button>
        )}
      />
    )
  }
  return (
    <div className="space-y-3">
      {jobs.map(job => (
        <Card key={job.id} onClick={() => onOpenJob(job)}>
          <div className="flex items-start gap-3">
            <DivisionDot slug={job.division_slug} className="mt-2" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{job.title}</p>
                  {clientById.get(job.client_id) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {clientById.get(job.client_id).name}
                      {premisesById.get(job.premises_id) && ` · ${premisesById.get(job.premises_id).name ?? premisesById.get(job.premises_id).address_line_1}`}
                    </p>
                  )}
                </div>
                <Badge variant={statusVariant(job.status)} className="shrink-0">
                  {statusLabel(job.status)}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                {job.scheduled_date && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" /> {formatDate(job.scheduled_date)} · {formatTime(job.scheduled_date)}
                  </span>
                )}
                {job.price != null && (
                  <span className="inline-flex items-center gap-1 tabular-nums">{formatGBP(job.price)}</span>
                )}
                {staffById.get(job.assigned_staff_id) && (
                  <span className="inline-flex items-center gap-1">
                    <Avatar name={staffById.get(job.assigned_staff_id).name} size="xs" /> {staffById.get(job.assigned_staff_id).name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
