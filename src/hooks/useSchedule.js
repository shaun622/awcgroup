import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { projectNextVisit } from './useRecurringProfiles'

/**
 * useSchedule — merges scheduled jobs with overdue premises into a single
 * normalised list, bucketed by Today / Tomorrow / This week / Upcoming /
 * Overdue.
 *
 * Each "stop" shape: { key, kind: 'job'|'overdue', date, division_slug,
 * title, subtitle, client_name, premises, status, href }
 */
export function useSchedule({ divisionSlug } = {}) {
  const { business } = useBusiness()
  const [jobs, setJobs] = useState([])
  const [overdue, setOverdue] = useState([])
  const [projections, setProjections] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const load = useCallback(async () => {
    if (!business) return
    setLoading(true)

    const endRange = new Date()
    endRange.setDate(endRange.getDate() + 28)       // 4 weeks look-ahead
    const startRange = new Date()
    startRange.setDate(startRange.getDate() - 1)    // yesterday onwards, to catch "today" late jobs
    startRange.setHours(0, 0, 0, 0)

    let jq = supabase.from('jobs')
      .select('id,title,status,scheduled_date,scheduled_duration_minutes,division_slug,client_id,premises_id,assigned_staff_id,price')
      .eq('business_id', business.id)
      .in('status', ['scheduled', 'in_progress', 'on_hold'])
      .gte('scheduled_date', startRange.toISOString())
      .lt('scheduled_date', endRange.toISOString())
      .order('scheduled_date', { ascending: true })
    if (divisionSlug) jq = jq.eq('division_slug', divisionSlug)

    let pq = supabase.from('premises')
      .select('id,client_id,division_slug,name,address_line_1,postcode,next_due_at,service_frequency')
      .eq('business_id', business.id)
      .eq('regular_service', true)
      .lt('next_due_at', new Date().toISOString())
    if (divisionSlug) pq = pq.eq('division_slug', divisionSlug)

    // Active recurring profiles — we'll project the next visit client-side
    let rq = supabase.from('recurring_profiles')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'active')
    if (divisionSlug) rq = rq.eq('division_slug', divisionSlug)

    const [jRes, pRes, rRes] = await Promise.all([jq, pq, rq])
    const js = jRes.data ?? []
    const os = pRes.data ?? []
    const rs = rRes.data ?? []

    // Enrich with client + premises lookups (one-shot, cached per-call)
    const clientIds = unique([...js.map(j => j.client_id), ...os.map(o => o.client_id), ...rs.map(r => r.client_id)])
    const premisesIds = unique([...js.map(j => j.premises_id), ...rs.map(r => r.premises_id)].filter(Boolean))

    const [{ data: clients }, { data: premises }] = await Promise.all([
      clientIds.length
        ? supabase.from('clients').select('id,name').in('id', clientIds)
        : Promise.resolve({ data: [] }),
      premisesIds.length
        ? supabase.from('premises').select('id,name,address_line_1,postcode').in('id', premisesIds)
        : Promise.resolve({ data: [] }),
    ])
    const cById = new Map((clients ?? []).map(c => [c.id, c]))
    const pById = new Map((premises ?? []).map(p => [p.id, p]))

    setJobs(js.map(j => ({
      key: `job-${j.id}`,
      kind: 'job',
      id: j.id,
      date: j.scheduled_date,
      division_slug: j.division_slug,
      title: j.title,
      status: j.status,
      client_name: cById.get(j.client_id)?.name ?? '—',
      premises: pById.get(j.premises_id),
      duration_minutes: j.scheduled_duration_minutes,
      price: j.price,
      href: `/jobs/${j.id}`,
    })))
    setOverdue(os.map(p => ({
      key: `overdue-${p.id}`,
      kind: 'overdue',
      id: p.id,
      date: p.next_due_at,
      division_slug: p.division_slug,
      title: p.name || p.address_line_1,
      subtitle: p.postcode,
      client_name: cById.get(p.client_id)?.name ?? '—',
      premises: p,
      frequency: p.service_frequency,
      client_id: p.client_id,
      href: `/clients/${p.client_id}`,
    })))
    setProjections(rs
      .map(r => {
        const next = projectNextVisit(r)
        if (!next) return null
        const prem = pById.get(r.premises_id)
        return {
          key: `profile-${r.id}`,
          kind: 'recurring',
          id: r.id,
          date: next.toISOString(),
          division_slug: r.division_slug,
          title: r.title,
          client_name: cById.get(r.client_id)?.name ?? '—',
          premises: prem,
          frequency: r.frequency,
          client_id: r.client_id,
          price: r.price,
          duration_minutes: r.duration_minutes,
          href: r.profile_type === 'fire_door_inspection' && r.premises_id
            ? `/premises/${r.premises_id}`
            : '/recurring',
        }
      })
      .filter(Boolean))
    setLoading(false)
  }, [business, divisionSlug])

  useEffect(() => { load() }, [load])

  // Refetch on any jobs or premises change
  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase.channel(`schedule-${business.id}-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `business_id=eq.${business.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'premises', filter: `business_id=eq.${business.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_profiles', filter: `business_id=eq.${business.id}` }, () => load())
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business, load])

  const buckets = useMemo(() => bucketStops([...overdue, ...jobs, ...projections]), [jobs, overdue, projections])

  return { buckets, jobs, overdue, projections, loading, refetch: load }
}

function unique(xs) {
  return Array.from(new Set(xs.filter(Boolean)))
}

function bucketStops(stops) {
  const now = new Date()
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const endOfTomorrow = new Date(startOfTomorrow); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
  // Sunday end of week (ISO: Mon..Sun)
  const endOfWeek = new Date(startOfToday)
  const dayIdx = startOfToday.getDay() || 7        // 1..7 with Monday=1
  endOfWeek.setDate(endOfWeek.getDate() + (7 - dayIdx + 1))

  const out = { overdue: [], today: [], tomorrow: [], thisWeek: [], upcoming: [] }
  for (const s of stops) {
    const d = s.date ? new Date(s.date) : null
    if (!d) { out.upcoming.push(s); continue }
    if (s.kind === 'overdue' || (s.kind !== 'recurring' && d < startOfToday) || (s.kind === 'recurring' && d < startOfToday)) {
      out.overdue.push(s)
    } else if (d < startOfTomorrow) {
      out.today.push(s)
    } else if (d < endOfTomorrow) {
      out.tomorrow.push(s)
    } else if (d < endOfWeek) {
      out.thisWeek.push(s)
    } else {
      out.upcoming.push(s)
    }
  }
  // Sort each bucket by date asc (overdue most-overdue first)
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => new Date(a.date) - new Date(b.date))
  }
  return out
}
