import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock, AlertTriangle, Plus, Clock, Repeat, ChevronLeft, ChevronRight,
  CalendarDays, ListTree,
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
import { cn, statusLabel, statusVariant } from '../lib/utils'

// ─── Date helpers ──────────────────────────────────────────────
function ymd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sameYMD(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getMondayOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0=Sun..6=Sat
  const diffToMon = (dow + 6) % 7
  d.setDate(d.getDate() - diffToMon)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatRangeTitle(start, end) {
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()
  const startFmt = start.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric',
    month: sameMonth ? undefined : 'short',
    year: sameYear ? undefined : 'numeric',
  })
  const endFmt = end.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  return `${startFmt} — ${endFmt}`
}

function formatDayTitle(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function timeOnly(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: false })
}

// ─── Page component ────────────────────────────────────────────
export default function Schedule() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const { jobs, overdue, projections, loading } = useSchedule({ divisionSlug })
  const { createJob } = useJobs({ divisionSlug })

  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()))
  const [view, setView] = useState('week') // 'week' | 'today'
  const [addOpen, setAddOpen] = useState(false)

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )
  const weekEnd = addDays(weekStart, 6)
  const isThisWeek = sameYMD(weekStart, getMondayOfWeek(new Date()))

  // All non-overdue stops — combined jobs + recurring projections.
  // Overdue gets its own pinned section above the grid.
  const allStops = useMemo(() => [...jobs, ...projections], [jobs, projections])

  // Bucket stops by ymd day-key for the active week. Cards render in
  // chronological order within each day.
  const stopsByDay = useMemo(() => {
    const m = new Map()
    for (const day of weekDays) m.set(ymd(day), [])
    for (const s of allStops) {
      const d = s.date ? new Date(s.date) : null
      if (!d) continue
      const key = ymd(d)
      if (m.has(key)) m.get(key).push(s)
    }
    for (const stops of m.values()) {
      stops.sort((a, b) => new Date(a.date) - new Date(b.date))
    }
    return m
  }, [weekDays, allStops])

  const todayStops = stopsByDay.get(ymd(new Date())) || []
  const totalThisWeek = Array.from(stopsByDay.values()).reduce((sum, s) => sum + s.length, 0)

  function handleStopOpen(stop) {
    if (stop.href) navigate(stop.href)
  }

  return (
    <PageWrapper size="xl">
      {/* Hero — eyebrow + dynamic title + nav/view actions */}
      <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            <CalendarClock className="w-3.5 h-3.5" strokeWidth={2.5} />
            {view === 'today' ? 'Day view' : 'Week view'}
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="font-medium normal-case tracking-normal text-gray-500 dark:text-gray-400">
              {isGroupView ? 'All divisions' : currentDivision?.name}
            </span>
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {view === 'today' ? formatDayTitle(new Date()) : formatRangeTitle(weekStart, weekEnd)}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:justify-end">
          {view === 'week' && (
            <NavPills
              isThisWeek={isThisWeek}
              onPrev={() => setWeekStart(d => addDays(d, -7))}
              onThisWeek={() => setWeekStart(getMondayOfWeek(new Date()))}
              onNext={() => setWeekStart(d => addDays(d, 7))}
            />
          )}
          <ViewToggle view={view} setView={setView} />
          <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Schedule
          </Button>
        </div>
      </div>

      {/* Overdue — always pinned at the top regardless of view, since it
          represents premises whose recurring service is past due. */}
      {overdue.length > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
            Overdue · {overdue.length}
          </h3>
          <div className="space-y-2">
            {overdue.map(s => <StopRow key={s.key} stop={s} onClick={() => handleStopOpen(s)} overdue />)}
          </div>
        </section>
      )}

      {loading && totalThisWeek === 0 && overdue.length === 0 && (
        <SkeletonList count={3} />
      )}

      {/* Today view — single-day list, full-width cards */}
      {view === 'today' && (
        todayStops.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing scheduled today"
            description="Switch to Week view to see what's coming up."
            action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Schedule a job</Button>}
          />
        ) : (
          <div className="space-y-2">
            {todayStops.map(s => <StopRow key={s.key} stop={s} onClick={() => handleStopOpen(s)} />)}
          </div>
        )
      )}

      {/* Week view */}
      {view === 'week' && totalThisWeek === 0 && overdue.length === 0 && !loading && (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled this week"
          description="Add jobs or enable regular maintenance on premises to populate the schedule."
          action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Schedule a job</Button>}
        />
      )}

      {view === 'week' && totalThisWeek > 0 && (
        <>
          {/* Desktop: 7-column grid, one column per day */}
          <div className="hidden md:block">
            <WeekGrid weekDays={weekDays} stopsByDay={stopsByDay} onStopSelect={handleStopOpen} />
          </div>
          {/* Mobile: stacked-by-day list */}
          <div className="md:hidden">
            <WeekStack weekDays={weekDays} stopsByDay={stopsByDay} onStopSelect={handleStopOpen} />
          </div>
        </>
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

// ─── Prev / This week / Next pills ─────────────────────────────
function NavPills({ isThisWeek, onPrev, onThisWeek, onNext }) {
  const pillBase = 'inline-flex items-center gap-1 px-3.5 h-9 rounded-full text-sm font-medium transition-colors border'
  const idle = 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-card'
  const activeNow = 'bg-brand-50 dark:bg-brand-950/40 border-brand-200/70 dark:border-brand-800/40 text-brand-700 dark:text-brand-300 shadow-card'
  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      <button onClick={onPrev} className={cn(pillBase, idle)}>
        <ChevronLeft className="w-4 h-4" strokeWidth={2} />
        Prev
      </button>
      <button onClick={onThisWeek} className={cn(pillBase, isThisWeek ? activeNow : idle)}>
        This week
      </button>
      <button onClick={onNext} className={cn(pillBase, idle)}>
        Next
        <ChevronRight className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── Week / Today toggle ──────────────────────────────────────
function ViewToggle({ view, setView }) {
  const opts = [
    { key: 'week',  Icon: CalendarDays, label: 'Week' },
    { key: 'today', Icon: ListTree,     label: 'Today' },
  ]
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 shadow-card">
      {opts.map(o => {
        const active = view === o.key
        return (
          <button
            key={o.key}
            onClick={() => setView(o.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold transition-colors',
              active
                ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
            )}
          >
            <o.Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Desktop 7-column grid ─────────────────────────────────────
// Each column is a day; within the column the stops list scrolls if
// it overflows the column height. Today's column highlights with a
// brand-tone header.
function WeekGrid({ weekDays, stopsByDay, onStopSelect }) {
  const today = new Date()
  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map(day => {
        const stops = stopsByDay.get(ymd(day)) || []
        const isToday = sameYMD(day, today)
        const dow = day.toLocaleDateString('en-GB', { weekday: 'short' })
        const dayNum = day.getDate()
        return (
          <div key={ymd(day)} className="min-w-0 flex flex-col">
            <div className={cn(
              'rounded-t-xl px-3 py-2 border border-b-0',
              isToday
                ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-200/70 dark:border-brand-800/40'
                : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800',
            )}>
              <div className="flex items-baseline justify-between">
                <p className={cn(
                  'text-[10px] font-bold uppercase tracking-wider',
                  isToday ? 'text-brand-700 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400',
                )}>
                  {dow}
                </p>
                <p className={cn(
                  'text-sm font-semibold tabular-nums',
                  isToday ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300',
                )}>
                  {dayNum}
                </p>
              </div>
            </div>
            <div className={cn(
              'rounded-b-xl border border-t-0 p-2 flex-1 min-h-[140px] space-y-1.5',
              isToday
                ? 'bg-brand-50/40 dark:bg-brand-950/10 border-brand-200/70 dark:border-brand-800/40'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
            )}>
              {stops.length === 0 ? (
                <p className="text-[11px] text-gray-300 dark:text-gray-700 italic px-1 pt-1">No jobs</p>
              ) : (
                stops.map(s => <GridStopCard key={s.key} stop={s} onClick={() => onStopSelect(s)} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Compact stop card sized for a 7-col grid cell. Truncates aggressively.
function GridStopCard({ stop, onClick }) {
  const time = timeOnly(stop.date)
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 transition-colors"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <DivisionDot slug={stop.division_slug} />
        <span className="text-[10px] tabular-nums font-semibold text-gray-500 dark:text-gray-400">{time || '—'}</span>
        {stop.kind === 'recurring' && <Repeat className="w-3 h-3 text-gray-400 ml-auto" strokeWidth={2.25} />}
      </div>
      <p className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
        {stop.title}
      </p>
      {stop.client_name && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
          {stop.client_name}
        </p>
      )}
    </button>
  )
}

// ─── Mobile stacked-by-day list ────────────────────────────────
// One section per day with an inline header; today highlights with a
// "Today" pill. Empty days collapse to a single gray "No jobs" line.
function WeekStack({ weekDays, stopsByDay, onStopSelect }) {
  const today = new Date()
  return (
    <div className="space-y-3">
      {weekDays.map(day => {
        const stops = stopsByDay.get(ymd(day)) || []
        const isToday = sameYMD(day, today)
        const dow = day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        return (
          <div key={ymd(day)}>
            <div className="flex items-center gap-2 px-1 mb-1.5">
              <p className={cn(
                'text-[11px] font-semibold uppercase tracking-wider',
                isToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400',
              )}>
                {isToday ? 'Today' : dow}
              </p>
              <div className={cn(
                'flex-1 h-px',
                isToday ? 'bg-brand-200/70 dark:bg-brand-800/50' : 'bg-gray-100 dark:bg-gray-800',
              )} />
              {stops.length > 0 && (
                <span className="text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                  {stops.length}
                </span>
              )}
            </div>
            {stops.length === 0 ? (
              <p className="text-[12px] text-gray-400 dark:text-gray-600 px-1 italic">No jobs</p>
            ) : (
              <div className="space-y-2">
                {stops.map(s => <StopRow key={s.key} stop={s} onClick={() => onStopSelect(s)} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Full-width stop row (overdue + today + week-stack) ────────
function StopRow({ stop, onClick, overdue }) {
  return (
    <Card
      onClick={onClick}
      className={cn(overdue && 'border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10')}
    >
      <div className="flex items-start gap-3">
        <DivisionDot slug={stop.division_slug} className="mt-1.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">{stop.title}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {stop.client_name}
                {stop.premises?.address_line_1 && ` · ${stop.premises.address_line_1}`}
              </p>
            </div>
            {stop.kind === 'job' ? (
              <Badge variant={statusVariant(stop.status)} className="shrink-0">{statusLabel(stop.status)}</Badge>
            ) : (
              <Badge variant={overdue ? 'danger' : 'default'} className="shrink-0">
                <Repeat className="w-3 h-3" /> {statusLabel(stop.frequency ?? 'visit')}
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            {stop.date && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <CalendarClock className="w-3 h-3" />
                {timeOnly(stop.date)}
              </span>
            )}
            {stop.duration_minutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {stop.duration_minutes}m
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
