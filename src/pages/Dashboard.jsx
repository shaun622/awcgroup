import { useMemo } from 'react'
import { CalendarClock, Briefcase, Receipt, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import DivisionChip from '../components/ui/DivisionChip'
import { useDivision } from '../contexts/DivisionContext'
import { formatGBP } from '../lib/utils'
import { DIVISION_SLUGS, getDivision } from '../lib/divisionRegistry'

// Demo/placeholder data — replaced by real queries once Supabase tables land
const DEMO_STATS_PER_DIVISION = {
  pest:      { jobsThisWeek: 12, activeJobs: 4, pendingQuotes: 7,  overdue: 2, revenueMTD: 8240 },
  fire:      { jobsThisWeek: 4,  activeJobs: 1, pendingQuotes: 3,  overdue: 1, revenueMTD: 5600 },
  hygiene:   { jobsThisWeek: 8,  activeJobs: 3, pendingQuotes: 2,  overdue: 0, revenueMTD: 3120 },
  locksmith: { jobsThisWeek: 3,  activeJobs: 0, pendingQuotes: 1,  overdue: 0, revenueMTD: 1480 },
}

export default function Dashboard() {
  const { currentDivision, isGroupView, active } = useDivision()

  const stats = useMemo(() => {
    if (!isGroupView) return DEMO_STATS_PER_DIVISION[active] ?? DEMO_STATS_PER_DIVISION.pest
    return DIVISION_SLUGS.reduce((acc, s) => {
      const d = DEMO_STATS_PER_DIVISION[s]
      acc.jobsThisWeek += d.jobsThisWeek
      acc.activeJobs   += d.activeJobs
      acc.pendingQuotes += d.pendingQuotes
      acc.overdue      += d.overdue
      acc.revenueMTD   += d.revenueMTD
      return acc
    }, { jobsThisWeek: 0, activeJobs: 0, pendingQuotes: 0, overdue: 0, revenueMTD: 0 })
  }, [active, isGroupView])

  const heading = isGroupView
    ? 'Group overview'
    : `${currentDivision?.name ?? 'Dashboard'}`

  const tagline = isGroupView
    ? 'All divisions, combined view'
    : currentDivision?.tagline

  return (
    <PageWrapper size="full">
      {/* Hero */}
      <section className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Good morning
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
        <StatCard label="This week" value={stats.jobsThisWeek} icon={CalendarClock} trend={1} trendLabel="+2 vs last" />
        <StatCard label="Active jobs" value={stats.activeJobs} icon={Briefcase} />
        <StatCard label="Pending quotes" value={stats.pendingQuotes} icon={Receipt} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} trend={stats.overdue > 0 ? -1 : 0} trendLabel={stats.overdue > 0 ? 'Action required' : 'All good'} />
      </section>

      {/* Revenue card */}
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
              {isGroupView ? 'Across all enabled divisions' : 'From completed jobs and settled invoices'}
            </p>
          </div>
        </Card>

        <Card className="!p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Today</p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Scheduled</span>
              <span className="font-semibold tabular-nums">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Completed</span>
              <span className="font-semibold tabular-nums">1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Overdue</span>
              <Badge variant={stats.overdue ? 'warning' : 'success'}>{stats.overdue ? `${stats.overdue}` : 'None'}</Badge>
            </div>
          </div>
          <button className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
            View full schedule
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>
      </section>

      {/* Group-view division breakdown */}
      {isGroupView && (
        <section className="mb-6">
          <h2 className="section-title mb-3">By division</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DIVISION_SLUGS.map(slug => {
              const d = getDivision(slug)
              const s = DEMO_STATS_PER_DIVISION[slug]
              return (
                <Card key={slug} className="!p-4">
                  <DivisionChip slug={slug} variant="soft" size="sm" />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-gray-500">Jobs this wk</p>
                      <p className="font-bold tabular-nums">{s.jobsThisWeek}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Revenue MTD</p>
                      <p className="font-bold tabular-nums">{formatGBP(s.revenueMTD)}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent activity placeholder */}
      <section>
        <h2 className="section-title mb-3">Recent activity</h2>
        <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
          {[
            { label: 'New quote sent', sub: 'Riverside Café — £420 deep clean', when: '2h ago', variant: 'primary' },
            { label: 'Job completed',  sub: 'Blue Horizon Offices — pest monthly', when: '5h ago', variant: 'success' },
            { label: 'Client added',    sub: 'Marlow Trust Academy',               when: '1d ago', variant: 'default' },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Badge variant={row.variant} dot>
                {row.label}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{row.sub}</p>
              </div>
              <span className="text-[11px] text-gray-400 shrink-0">{row.when}</span>
            </div>
          ))}
        </Card>
      </section>
    </PageWrapper>
  )
}
