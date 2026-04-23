import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, MapPin, Edit3, Building2, Briefcase, Receipt, Activity, Plus,
  Clock, Repeat,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import DivisionChip, { DivisionDot } from '../components/ui/DivisionChip'
import { SkeletonCard, SkeletonList } from '../components/ui/Skeleton'
import AddPremisesModal from '../components/ui/AddPremisesModal'
import { useClient } from '../hooks/useClients'
import { usePremises } from '../hooks/usePremises'
import { useJobs } from '../hooks/useJobs'
import { useQuotes } from '../hooks/useQuotes'
import { useStaff } from '../hooks/useStaff'
import { useDivision } from '../contexts/DivisionContext'
import { DIVISION_SLUGS, getDivision } from '../lib/divisionRegistry'
import { cn, formatDate, formatTime, statusLabel, statusVariant, formatGBP } from '../lib/utils'
import NewJobModal from '../components/ui/NewJobModal'
import { CalendarClock } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'premises', label: 'Premises', icon: MapPin },
  { id: 'jobs',     label: 'Jobs',     icon: Briefcase },
  { id: 'quotes',   label: 'Quotes',   icon: Receipt },
  { id: 'activity', label: 'Activity', icon: Activity },
]

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { client, loading } = useClient(id)
  const [tab, setTab] = useState('overview')

  if (loading) {
    return <PageWrapper size="xl"><SkeletonCard /></PageWrapper>
  }

  if (!client) {
    return (
      <PageWrapper size="xl">
        <EmptyState title="Client not found" description="This client may have been deleted or you don't have access." />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper size="xl">
      {/* Back */}
      <button
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Clients
      </button>

      {/* Header */}
      <Card className="!p-5 mb-4">
        <div className="flex items-start gap-4">
          <Avatar name={client.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">{client.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{statusLabel(client.client_type)}</p>
              </div>
              <Badge variant={statusVariant(client.pipeline_stage)}>
                {statusLabel(client.pipeline_stage)}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-600">
                  <Phone className="w-3.5 h-3.5" /> {client.phone}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-brand-600">
                  <Mail className="w-3.5 h-3.5" /> {client.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 mb-4 overflow-x-auto scrollbar-none">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                active
                  ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <OverviewTab client={client} />}
      {tab === 'premises' && <PremisesTab client={client} />}

      {tab === 'jobs' && <JobsTab client={client} />}

      {tab === 'quotes' && <QuotesTab client={client} />}

      {tab === 'activity' && (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Everything related to this client — quotes sent, jobs completed, reports filed — will appear here as it happens."
        />
      )}
    </PageWrapper>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */

function OverviewTab({ client }) {
  return (
    <div className="space-y-4">
      <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
        <DetailRow icon={<MapPin className="w-4 h-4" />} label="Address"
          value={[client.address_line_1, client.address_line_2, client.city, client.postcode].filter(Boolean).join(', ') || '—'} />
        <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={client.phone || '—'} />
        <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={client.email || '—'} />
      </Card>

      {client.notes && (
        <Card>
          <p className="section-title mb-2">Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{client.notes}</p>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" leftIcon={<Edit3 className="w-4 h-4" />}>Edit client</Button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */

function PremisesTab({ client }) {
  const { premises, loading, addPremises } = usePremises({ clientId: client.id })
  const { currentDivision, isGroupView } = useDivision()
  const [addOpen, setAddOpen] = useState(false)

  // Scope: if a specific division is active, only show its premises.
  // In Group view, show all divisions (grouped by division).
  const filtered = useMemo(() => {
    if (!currentDivision) return premises
    return premises.filter(p => p.division_slug === currentDivision.slug)
  }, [premises, currentDivision])

  const groupedByDivision = useMemo(() => {
    const groups = {}
    for (const p of premises) {
      (groups[p.division_slug] ||= []).push(p)
    }
    return groups
  }, [premises])

  if (loading) return <SkeletonList count={2} />

  const shown = isGroupView ? premises : filtered

  if (shown.length === 0) {
    return (
      <>
        <EmptyState
          icon={MapPin}
          title="No premises yet"
          description={
            currentDivision
              ? `Add a ${currentDivision.name.toLowerCase()} site for ${client.name}.`
              : `Add the first site for ${client.name} — division-tagged.`
          }
          action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add premises</Button>}
        />
        <AddPremisesModal open={addOpen} onClose={() => setAddOpen(false)} client={client} addPremises={addPremises} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {shown.length} {shown.length === 1 ? 'site' : 'sites'}
          {currentDivision && !isGroupView && <> · {currentDivision.name}</>}
        </p>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
          Add premises
        </Button>
      </div>

      {isGroupView ? (
        <div className="space-y-6">
          {DIVISION_SLUGS.map(slug => {
            const list = groupedByDivision[slug] ?? []
            if (list.length === 0) return null
            return (
              <div key={slug}>
                <div className="flex items-center gap-2 mb-2">
                  <DivisionChip slug={slug} variant="soft" size="sm" />
                  <span className="text-xs text-gray-500">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.map(p => <PremisesCard key={p.id} premises={p} />)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(p => <PremisesCard key={p.id} premises={p} />)}
        </div>
      )}

      <AddPremisesModal open={addOpen} onClose={() => setAddOpen(false)} client={client} addPremises={addPremises} />
    </>
  )
}

function PremisesCard({ premises }) {
  const addr = [premises.address_line_1, premises.address_line_2, premises.city, premises.postcode].filter(Boolean).join(', ')
  const div = getDivision(premises.division_slug)
  return (
    <Card>
      <div className="flex items-start gap-3">
        <DivisionDot slug={premises.division_slug} className="mt-1.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {premises.name && (
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{premises.name}</p>
              )}
              <p className={cn('text-sm truncate', premises.name ? 'text-gray-500 dark:text-gray-400' : 'font-medium text-gray-900 dark:text-gray-100')}>
                {addr || '—'}
              </p>
            </div>
            {premises.regular_service && (
              <Badge variant="primary" className="shrink-0">
                <Repeat className="w-3 h-3" /> {statusLabel(premises.service_frequency)}
              </Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1">{statusLabel(premises.site_type)}</span>
            {premises.next_due_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> Next: {formatDate(premises.next_due_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */

function JobsTab({ client }) {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const { jobs, loading, createJob } = useJobs({ clientId: client.id, divisionSlug })
  const { staff } = useStaff({ divisionSlug })
  const staffById = useMemo(() => {
    const m = new Map(); staff.forEach(s => m.set(s.id, s)); return m
  }, [staff])
  const [addOpen, setAddOpen] = useState(false)

  if (loading) return <SkeletonList count={2} />

  if (jobs.length === 0) {
    return (
      <>
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description={`Schedule a job for ${client.name}${currentDivision ? ` in ${currentDivision.name}` : ''}.`}
          action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Schedule job</Button>}
        />
        <NewJobModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          client={client}
          createJob={createJob}
          onCreated={j => navigate(`/jobs/${j.id}`)}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          {currentDivision && !isGroupView && <> · {currentDivision.name}</>}
        </p>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
          Schedule job
        </Button>
      </div>

      <div className="space-y-3">
        {jobs.map(job => (
          <Card key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}>
            <div className="flex items-start gap-3">
              <DivisionDot slug={job.division_slug} className="mt-2" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{job.title}</p>
                  <Badge variant={statusVariant(job.status)} className="shrink-0">{statusLabel(job.status)}</Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {job.scheduled_date && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> {formatDate(job.scheduled_date)} · {formatTime(job.scheduled_date)}
                    </span>
                  )}
                  {job.price != null && <span className="tabular-nums">{formatGBP(job.price)}</span>}
                  {staffById.get(job.assigned_staff_id) && (
                    <span className="inline-flex items-center gap-1">
                      <Avatar name={staffById.get(job.assigned_staff_id).name} size="xs" />
                      {staffById.get(job.assigned_staff_id).name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <NewJobModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        client={client}
        createJob={createJob}
        onCreated={j => navigate(`/jobs/${j.id}`)}
      />
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */

function QuotesTab({ client }) {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const { quotes, loading } = useQuotes({ clientId: client.id, divisionSlug })

  if (loading) return <SkeletonList count={2} />

  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No quotes yet"
        description={`Draft a quote for ${client.name}.`}
        action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate(`/quotes/new?client=${client.id}`)}>New quote</Button>}
      />
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}
          {currentDivision && !isGroupView && <> · {currentDivision.name}</>}
        </p>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/quotes/new')}>New quote</Button>
      </div>

      <div className="space-y-3">
        {quotes.map(q => (
          <Card key={q.id} onClick={() => navigate(`/quotes/${q.id}`)}>
            <div className="flex items-start gap-3">
              <DivisionDot slug={q.division_slug} className="mt-2" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{q.subject || q.quote_number}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{q.quote_number}</p>
                  </div>
                  <Badge variant={statusVariant(q.status)} className="shrink-0">{statusLabel(q.status)}</Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100">{formatGBP(q.total)}</span>
                  <span>{formatDate(q.created_at)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{value || '—'}</div>
      </div>
    </div>
  )
}
