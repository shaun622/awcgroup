import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, CalendarClock, AlertTriangle, Plus, Clock, Repeat, ArrowRight,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { DivisionDot } from '../components/ui/DivisionChip'
import NewJobModal from '../components/ui/NewJobModal'
import { useSchedule } from '../hooks/useSchedule'
import { useJobs } from '../hooks/useJobs'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, formatRelative, formatTime, statusLabel, statusVariant } from '../lib/utils'

const TABS = [
  { id: 'today',    label: 'Today' },
  { id: 'week',     label: 'This week' },
  { id: 'upcoming', label: 'Upcoming' },
]

export default function Schedule() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const { buckets, loading } = useSchedule({ divisionSlug })
  const { createJob } = useJobs({ divisionSlug })
  const [tab, setTab] = useState('today')
  const [addOpen, setAddOpen] = useState(false)

  const totalToday = buckets.today.length
  const totalTomorrow = buckets.tomorrow.length
  const totalWeek = buckets.today.length + buckets.tomorrow.length + buckets.thisWeek.length
  const totalUpcoming = buckets.upcoming.length
  const totalOverdue = buckets.overdue.length

  return (
    <PageWrapper size="xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Schedule</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isGroupView ? 'All divisions' : currentDivision?.name}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Schedule job
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
        {TABS.map(t => {
          const active = tab === t.id
          const count = t.id === 'today' ? totalToday : t.id === 'week' ? totalWeek : totalUpcoming
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px] flex items-center gap-1.5',
                active
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              {t.label}
              <span className={cn('inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] tabular-nums', active ? 'bg-white/25 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Overdue always visible at the top */}
      {totalOverdue > 0 && (
        <section className="mb-6">
          <SectionHeading icon={AlertTriangle} label={`Overdue (${totalOverdue})`} tone="danger" />
          <StopList stops={buckets.overdue} tone="danger" onOpen={s => navigate(s.href)} />
        </section>
      )}

      {loading && (buckets.today.length === 0 && buckets.thisWeek.length === 0) && (
        <SkeletonList count={3} />
      )}

      {tab === 'today' && (
        <>
          <Section
            label={`Today (${buckets.today.length})`}
            empty="Nothing on the schedule for today."
            stops={buckets.today}
            onOpen={s => navigate(s.href)}
          />
          {buckets.tomorrow.length > 0 && (
            <Section
              label={`Tomorrow (${buckets.tomorrow.length})`}
              stops={buckets.tomorrow}
              onOpen={s => navigate(s.href)}
            />
          )}
        </>
      )}

      {tab === 'week' && (
        <>
          {buckets.today.length > 0 && (
            <Section label={`Today (${buckets.today.length})`} stops={buckets.today} onOpen={s => navigate(s.href)} />
          )}
          {buckets.tomorrow.length > 0 && (
            <Section label={`Tomorrow (${buckets.tomorrow.length})`} stops={buckets.tomorrow} onOpen={s => navigate(s.href)} />
          )}
          {buckets.thisWeek.length > 0 && (
            <Section label={`Later this week (${buckets.thisWeek.length})`} stops={buckets.thisWeek} onOpen={s => navigate(s.href)} />
          )}
          {totalWeek === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled this week"
              description="Add jobs or enable regular maintenance on premises to populate the schedule."
              action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Schedule job</Button>}
            />
          )}
        </>
      )}

      {tab === 'upcoming' && (
        buckets.upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming jobs"
            description="Jobs scheduled more than a week out will appear here."
          />
        ) : (
          <Section label={`Upcoming (${buckets.upcoming.length})`} stops={buckets.upcoming} onOpen={s => navigate(s.href)} />
        )
      )}

      <NewJobModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        createJob={createJob}
        onCreated={j => navigate(`/jobs/${j.id}`)}
      />
    </PageWrapper>
  )
}

function SectionHeading({ icon: Icon, label, tone }) {
  return (
    <h3 className={cn(
      'section-title mb-2 flex items-center gap-2',
      tone === 'danger' && 'text-red-600 dark:text-red-400',
    )}>
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />}
      {label}
    </h3>
  )
}

function Section({ label, stops, empty, onOpen }) {
  return (
    <section className="mb-6">
      <SectionHeading label={label} />
      {stops.length === 0
        ? <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p>
        : <StopList stops={stops} onOpen={onOpen} />}
    </section>
  )
}

function StopList({ stops, onOpen, tone }) {
  return (
    <div className="space-y-3">
      {stops.map(s => <StopCard key={s.key} stop={s} tone={tone} onClick={() => onOpen(s)} />)}
    </div>
  )
}

function StopCard({ stop, tone, onClick }) {
  const isOverdue = stop.kind === 'overdue' || tone === 'danger'
  return (
    <Card onClick={onClick} className={cn(isOverdue && 'border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10')}>
      <div className="flex items-start gap-3">
        <DivisionDot slug={stop.division_slug} className="mt-2" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{stop.title}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {stop.client_name}
                {stop.premises?.address_line_1 && ` · ${stop.premises.address_line_1}`}
              </p>
            </div>
            {stop.kind === 'job' ? (
              <Badge variant={statusVariant(stop.status)} className="shrink-0">{statusLabel(stop.status)}</Badge>
            ) : (
              <Badge variant="danger" className="shrink-0">
                <Repeat className="w-3 h-3" /> {statusLabel(stop.frequency ?? 'visit')}
              </Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {stop.date && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                {isOverdue
                  ? `Due ${formatDate(stop.date)} · ${formatRelative(stop.date)}`
                  : `${formatDate(stop.date)} · ${formatTime(stop.date)}`}
              </span>
            )}
            {stop.duration_minutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {stop.duration_minutes}m
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 mt-2 shrink-0" />
      </div>
    </Card>
  )
}
