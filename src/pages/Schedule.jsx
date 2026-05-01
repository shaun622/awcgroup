import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock, AlertTriangle, Plus, Clock, Repeat, ChevronLeft, ChevronRight,
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
  const dow = d.getDay()
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
  const startFmt = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const endFmt = end.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  return `${startFmt} — ${endFmt}`
}

function formatDayTitle(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function timeOnly(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: false })
}

// Reusable pill button — matches Tree Mate's pill-ghost utility,
// inlined here because AWC doesn't define that custom class.
const PILL_BASE = 'inline-flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-medium border transition-colors'
const PILL_IDLE = 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
const PILL_ACTIVE = 'bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800/50 text-brand-700 dark:text-brand-300 hover:bg-brand-100'

// ─── Page component ────────────────────────────────────────────
export default function Schedule() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const { jobs, overdue, projections, loading } = useSchedule({ divisionSlug })
  const { createJob } = useJobs({ divisionSlug })

  const [selectedDate, setSelectedDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })
  const [view, setView] = useState('week') // 'week' | 'today'
  const [addOpen, setAddOpen] = useState(false)

  const weekStart = useMemo(() => getMondayOfWeek(selectedDate), [selectedDate])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )
  const weekEnd = addDays(weekStart, 6)
  const isThisWeek = sameYMD(weekStart, getMondayOfWeek(new Date()))

  const allStops = useMemo(() => [...jobs, ...projections], [jobs, projections])

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

  const todayKey = ymd(new Date())
  const todayStops = stopsByDay.get(todayKey) || []
  const totalThisWeek = Array.from(stopsByDay.values()).reduce((sum, s) => sum + s.length, 0)

  const goToWeek = (offset) => setSelectedDate(d => addDays(d, offset * 7))
  const goToDay = (offset) => setSelectedDate(d => addDays(d, offset))
  const goToToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setSelectedDate(d) }

  function handleStopOpen(stop) {
    if (stop.href) navigate(stop.href)
  }

  return (
    <PageWrapper size="full">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
            <CalendarClock className="w-3.5 h-3.5" strokeWidth={2.5} />
            {view === 'today' ? 'Day view' : 'Week view'}
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="font-medium normal-case tracking-normal text-gray-500 dark:text-gray-400">
              {isGroupView ? 'All divisions' : currentDivision?.name}
            </span>
          </p>
          <h1 className="mt-1 text-2xl md:text-[26px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {view === 'today' ? formatDayTitle(selectedDate) : formatRangeTitle(weekStart, weekEnd)}
          </h1>
        </div>

        {/* Single-row control bar — Prev/This week/Next + divider + Week|Day toggle + Schedule */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => view === 'week' ? goToWeek(-1) : goToDay(-1)}
            className={cn(PILL_BASE, PILL_IDLE)}
            aria-label="Previous"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> Prev
          </button>
          <button
            onClick={goToToday}
            className={cn(PILL_BASE, isThisWeek ? PILL_ACTIVE : PILL_IDLE)}
          >
            {view === 'week' ? 'This week' : 'Today'}
          </button>
          <button
            onClick={() => view === 'week' ? goToWeek(1) : goToDay(1)}
            className={cn(PILL_BASE, PILL_IDLE)}
            aria-label="Next"
          >
            Next <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Compact view selector */}
          {[
            { key: 'week',  label: 'Week' },
            { key: 'today', label: 'Day'  },
          ].map(v => {
            const active = view === v.key
            return (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  'rounded-full px-2.5 h-7 text-[11px] font-semibold transition-colors',
                  active
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                )}
              >
                {v.label}
              </button>
            )
          })}

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />} size="sm">
            Schedule
          </Button>
        </div>

        {/* Mobile control bar — wraps nicely on small screens */}
        <div className="flex md:hidden items-center justify-end gap-1.5 flex-wrap">
          <button onClick={() => view === 'week' ? goToWeek(-1) : goToDay(-1)} className={cn(PILL_BASE, PILL_IDLE)} aria-label="Previous">
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} /> Prev
          </button>
          <button onClick={goToToday} className={cn(PILL_BASE, isThisWeek ? PILL_ACTIVE : PILL_IDLE)}>
            {view === 'week' ? 'This week' : 'Today'}
          </button>
          <button onClick={() => view === 'week' ? goToWeek(1) : goToDay(1)} className={cn(PILL_BASE, PILL_IDLE)} aria-label="Next">
            Next <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />} size="sm">Schedule</Button>
        </div>
      </div>

      {/* ── Overdue (always pinned) ──────────────────────── */}
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

      {/* ── Day view (single-day list) ───────────────────── */}
      {view === 'today' && !loading && (
        (() => {
          const dayKey = ymd(selectedDate)
          const dayStops = stopsByDay.get(dayKey) || []
          if (dayStops.length === 0) {
            return (
              <EmptyState
                icon={CalendarClock}
                title={`Nothing scheduled ${sameYMD(selectedDate, new Date()) ? 'today' : 'on this day'}`}
                description="Switch to Week to see other days, or step backwards/forwards."
                action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Schedule a job</Button>}
              />
            )
          }
          return (
            <div className="space-y-2">
              {dayStops.map(s => <StopRow key={s.key} stop={s} onClick={() => handleStopOpen(s)} />)}
            </div>
          )
        })()
      )}

      {/* ── Week view ────────────────────────────────────── */}
      {view === 'week' && !loading && totalThisWeek === 0 && overdue.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled this week"
          description="Add jobs or enable regular maintenance on premises to populate the schedule."
          action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Schedule a job</Button>}
        />
      )}

      {view === 'week' && totalThisWeek > 0 && (
        <>
          {/* Desktop: full-width 7-col grid wrapped in a single card */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
              {weekDays.map(day => {
                const isDayToday = sameYMD(day, new Date())
                return (
                  <div key={ymd(day)} className="px-3 py-2.5 border-r last:border-r-0 border-gray-200 dark:border-gray-800">
                    <div className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider',
                      isDayToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400',
                    )}>
                      {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </div>
                    <div className={cn(
                      'text-[20px] font-bold tabular-nums leading-none mt-0.5',
                      isDayToday ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-gray-100',
                    )}>
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-7 min-h-[180px]">
              {weekDays.map(day => {
                const stops = stopsByDay.get(ymd(day)) || []
                return (
                  <div
                    key={ymd(day)}
                    className="px-2 py-2 border-r last:border-r-0 border-gray-200 dark:border-gray-800 space-y-1.5"
                  >
                    {stops.length === 0 && (
                      <div className="text-[10.5px] italic text-gray-400 dark:text-gray-600">—</div>
                    )}
                    {stops.map(stop => <GridStopCard key={stop.key} stop={stop} onClick={() => handleStopOpen(stop)} />)}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile: stacked-by-day list */}
          <div className="md:hidden space-y-3">
            {weekDays.map(day => {
              const stops = stopsByDay.get(ymd(day)) || []
              const isDayToday = sameYMD(day, new Date())
              return (
                <div key={ymd(day)}>
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <p className={cn(
                      'text-xs font-semibold uppercase tracking-wider',
                      isDayToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400',
                    )}>
                      {isDayToday ? 'Today' : day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                    {stops.length > 0 && (
                      <span className="text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">{stops.length}</span>
                    )}
                  </div>
                  {stops.length === 0 ? (
                    <p className="text-[12px] text-gray-400 dark:text-gray-600 px-1 italic">No jobs</p>
                  ) : (
                    <div className="space-y-2">
                      {stops.map(s => <StopRow key={s.key} stop={s} onClick={() => handleStopOpen(s)} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Today list — desktop only, below the grid (matches Tree Mate) */}
          {todayStops.length > 0 && (
            <div className="hidden md:block mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  <CalendarClock className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Today
                </div>
                <span className="text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">{todayStops.length}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {todayStops.map(stop => (
                  <button
                    key={stop.key}
                    onClick={() => handleStopOpen(stop)}
                    className="w-full grid grid-cols-12 px-4 py-2.5 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <div className="col-span-2 text-[11px] font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
                      {timeOnly(stop.date) || '—'}
                    </div>
                    <div className="col-span-7 min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{stop.title}</div>
                      <div className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">
                        {[stop.client_name, stop.premises?.address_line_1].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <div className="col-span-3 flex justify-end">
                      {stop.kind === 'job' ? (
                        <Badge variant={statusVariant(stop.status)}>{statusLabel(stop.status)}</Badge>
                      ) : (
                        <Badge variant="default"><Repeat className="w-3 h-3" /> {statusLabel(stop.frequency ?? 'visit')}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
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

// ─── Compact grid stop card ────────────────────────────────────
// Matches Tree Mate's brand-tinted accent style: bg-brand-50, left-border
// stripe, time at top, title middle, client below.
function GridStopCard({ stop, onClick }) {
  const time = timeOnly(stop.date)
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-brand-50 dark:bg-brand-950/30 border-l-2 border-brand-500 rounded-md px-2 py-1.5 hover:bg-brand-100 dark:hover:bg-brand-950/50 transition-colors"
    >
      <div className="flex items-center gap-1 mb-0.5">
        {time && (
          <span className="text-[9.5px] font-semibold tabular-nums text-brand-700 dark:text-brand-300">{time}</span>
        )}
        {stop.kind === 'recurring' && <Repeat className="w-3 h-3 text-brand-500 ml-auto" strokeWidth={2.25} />}
      </div>
      <div className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
        {stop.title}
      </div>
      {(stop.client_name || stop.premises?.address_line_1) && (
        <div className="text-[9.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {stop.client_name || stop.premises?.address_line_1}
        </div>
      )}
    </button>
  )
}

// ─── Full-width stop row (overdue + day view + week-stack mobile) ──
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
