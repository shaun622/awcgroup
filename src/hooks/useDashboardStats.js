import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'

/**
 * useDashboardStats — fast aggregate queries for the Dashboard KPI strip.
 * Filters to a single division when given; otherwise sums across all.
 *
 * Returns counts (never null) so the UI can render immediately with zeros
 * while the network catches up.
 */
export function useDashboardStats({ divisionSlug } = {}) {
  const { business } = useBusiness()
  const [stats, setStats] = useState({
    jobsThisWeek: 0,
    activeJobs: 0,
    pendingQuotes: 0,
    overduePremises: 0,
    revenueMTD: 0,
    clientCount: 0,
    scheduledToday: 0,
    completedToday: 0,
  })
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!business) return
    setLoading(true)

    const nowIso = new Date().toISOString()
    const weekStart = startOfWeek().toISOString()
    const monthStart = startOfMonth().toISOString()
    const todayStart = startOfDay().toISOString()
    const tomorrowStart = addDays(startOfDay(), 1).toISOString()
    const applyDiv = (q) => divisionSlug ? q.eq('division_slug', divisionSlug) : q

    const [jobsThisWeek, activeJobs, pendingQuotes, overduePremises, revenue, clientCount, scheduledToday, completedToday] = await Promise.all([
      applyDiv(supabase.from('jobs').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('scheduled_date', weekStart)
        .lt('scheduled_date', addDays(startOfWeek(), 7).toISOString())),
      applyDiv(supabase.from('jobs').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .in('status', ['scheduled', 'in_progress'])),
      applyDiv(supabase.from('quotes').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .in('status', ['sent', 'viewed', 'follow_up'])),
      applyDiv(supabase.from('premises').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('regular_service', true)
        .lt('next_due_at', nowIso)),
      applyDiv(supabase.from('jobs').select('price')
        .eq('business_id', business.id)
        .eq('status', 'completed')
        .gte('completed_at', monthStart)),
      // Clients aren't division-scoped
      supabase.from('clients').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id),
      applyDiv(supabase.from('jobs').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_date', todayStart)
        .lt('scheduled_date', tomorrowStart)),
      applyDiv(supabase.from('jobs').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('status', 'completed')
        .gte('completed_at', todayStart)
        .lt('completed_at', tomorrowStart)),
    ])

    const revenueMTD = (revenue.data ?? []).reduce((acc, r) => acc + (Number(r.price) || 0), 0)

    setStats({
      jobsThisWeek: jobsThisWeek.count ?? 0,
      activeJobs: activeJobs.count ?? 0,
      pendingQuotes: pendingQuotes.count ?? 0,
      overduePremises: overduePremises.count ?? 0,
      revenueMTD,
      clientCount: clientCount.count ?? 0,
      scheduledToday: scheduledToday.count ?? 0,
      completedToday: completedToday.count ?? 0,
    })
    setLoading(false)
  }, [business, divisionSlug])

  useEffect(() => { refetch() }, [refetch])

  return { stats, loading, refetch }
}

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const day = x.getDay() || 7          // Monday-start week (Mon=1 … Sun=7)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - (day - 1))
  return x
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}

function addDays(d, n) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
