import { useNavigate } from 'react-router-dom'
import {
  CalendarClock, Briefcase, Receipt, AlertTriangle, ArrowRight, Sparkles, Users, Activity,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import DivisionChip, { DivisionDot } from '../components/ui/DivisionChip'
import { useDivision } from '../contexts/DivisionContext'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useActivity, activityPresentation } from '../hooks/useActivity'
import { formatGBP, formatRelative } from '../lib/utils'
import { DIVISION_SLUGS, getDivision } from '../lib/divisionRegistry'

export default function Dashboard() {
  const { currentDivision, isGroupView, active } = useDivision()
  const navigate = useNavigate()

  // Division-scoped stats for the main KPI strip
  const divisionSlug = isGroupView ? undefined : active
  const { stats, loading } = useDashboardStats({ divisionSlug })
  const { activities } = useActivity({ limit: 10, divisionSlug })

  const heading = isGroupView ? 'Group overview' : currentDivision?.name ?? 'Dashboard'
  const tagline = isGroupView ? 'All divisions, combined view' : currentDivision?.tagline

  return (
    <PageWrapper size="full">
      {/* Hero */}
      <section className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {greeting()}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{heading}</h1>
            {tagline && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tagline}</p>}
          </div>
          {!isGroupView && currentDivision && (
            <DivisionChip slug={currentDivision.slug} variant="solid" size="lg" />
          )}
        </div>
      </section>

      {/* KPI grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Jobs this week" value={stats.jobsThisWeek} icon={CalendarClock} onClick={() => navigate('/jobs')} />
        <StatCard label="Active jobs" value={stats.activeJobs} icon={Briefcase} onClick={() => navigate('/jobs')} />
        <StatCard label="Pending quotes" value={stats.pendingQuotes} icon={Receipt} onClick={() => navigate('/quotes')} />
        <StatCard
          label="Overdue"
          value={stats.overduePremises}
          icon={AlertTriangle}
          trend={stats.overduePremises > 0 ? -1 : 0}
          trendLabel={stats.overduePremises > 0 ? 'Action required' : 'All caught up'}
          onClick={() => navigate('/schedule')}
        />
      </section>

      {/* Revenue + clients */}
      <section className="grid gap-3 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2 !p-6 relative overflow-hidden border-brand-100 dark:border-brand-900/40">
          <div className="absolute inset-0 bg-gradient-brand-soft dark:hidden" aria-hidden />
          <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(135deg, rgb(var(--brand-950) / 0.6) 0%, rgb(var(--brand-900) / 0.3) 100%)' }} aria-hidden />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Revenue (month to date)</p>
            <p className="mt-2 text-3xl sm:text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {formatGBP(stats.revenueMTD)}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              From completed jobs this month {isGroupView && '· across all divisions'}
            </p>
          </div>
        </Card>

        <Card className="!p-6" onClick={() => navigate('/clients')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Clients</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{stats.clientCount}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Shared across divisions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" strokeWidth={2} />
            </div>
          </div>
          <button className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
            Open CRM <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>
      </section>

      {/* Today + recent activity */}
      <section className="grid gap-3 lg:grid-cols-3 mb-6">
        {/* Today */}
        <Card className="!p-6 lg:col-span-1" onClick={() => navigate('/schedule')}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Today</p>
          <div className="mt-3 space-y-2">
            <TodayRow label="Scheduled" value={stats.scheduledToday} />
            <TodayRow label="Completed" value={stats.completedToday} variant="success" />
            <TodayRow label="Overdue" value={stats.overduePremises} variant={stats.overduePremises ? 'warning' : 'default'} />
          </div>
          <button className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
            Open schedule <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>

        {/* Recent activity */}
        <Card className="!p-0 lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Recent activity
            </p>
            {activities.length > 0 && <span className="text-[11px] text-gray-400">{activities.length}</span>}
          </div>
          {activities.length === 0 ? (
            <div className="px-5 pb-6 text-sm text-gray-500 dark:text-gray-400">
              Nothing yet — activity shows up as you add clients, schedule jobs, and complete reports.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[320px] overflow-y-auto">
              {activities.map(a => {
                const pres = activityPresentation(a.event_type)
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    {a.division_slug
                      ? <DivisionDot slug={a.division_slug} className="mt-1.5" />
                      : <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mt-1.5" aria-hidden />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{a.title}</p>
                      {a.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{a.subtitle}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant={pres.variant} className="capitalize">{pres.label}</Badge>
                      <p className="text-[10px] text-gray-400 mt-1">{formatRelative(a.created_at)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </section>

      {/* Group-view per-division breakdown */}
      {isGroupView && <DivisionBreakdown />}

      {loading && (
        <p className="text-xs text-gray-400 text-center">Refreshing…</p>
      )}
    </PageWrapper>
  )
}

function TodayRow({ label, value, variant = 'default' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <Badge variant={variant === 'default' ? (value ? 'primary' : 'default') : variant}>
        {value}
      </Badge>
    </div>
  )
}

function DivisionBreakdown() {
  return (
    <section className="mb-6">
      <h2 className="section-title mb-3">By division</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DIVISION_SLUGS.map(slug => <DivisionCard key={slug} slug={slug} />)}
      </div>
    </section>
  )
}

function DivisionCard({ slug }) {
  const div = getDivision(slug)
  const { stats } = useDashboardStats({ divisionSlug: slug })
  return (
    <Card className="!p-4">
      <DivisionChip slug={slug} variant="soft" size="sm" />
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-[11px] text-gray-500">Jobs this wk</p>
          <p className="font-bold tabular-nums">{stats.jobsThisWeek}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Revenue MTD</p>
          <p className="font-bold tabular-nums">{formatGBP(stats.revenueMTD)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Active</p>
          <p className="font-bold tabular-nums">{stats.activeJobs}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Overdue</p>
          <p className="font-bold tabular-nums">{stats.overduePremises}</p>
        </div>
      </div>
    </Card>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
