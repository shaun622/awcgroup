import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { logActivity } from '../lib/activity'

/**
 * useJobs — load + filter + mutate jobs for the current business.
 * Filters are additive; leave undefined to skip.
 *
 * @param {object} opts
 * @param {string} [opts.clientId]
 * @param {string} [opts.premisesId]
 * @param {string} [opts.divisionSlug]  null = all divisions
 * @param {string} [opts.status]         null = all statuses
 */
export function useJobs({ clientId, premisesId, divisionSlug, status } = {}) {
  const { business } = useBusiness()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!business) { setJobs([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('jobs').select('*').eq('business_id', business.id)
    if (clientId) q = q.eq('client_id', clientId)
    if (premisesId) q = q.eq('premises_id', premisesId)
    if (divisionSlug) q = q.eq('division_slug', divisionSlug)
    if (status) q = q.eq('status', status)
    const { data, error } = await q.order('scheduled_date', { ascending: false, nullsFirst: false })
    if (error) setError(error)
    else setJobs(data ?? [])
    setLoading(false)
  }, [business, clientId, premisesId, divisionSlug, status])

  useEffect(() => { refetch() }, [refetch])

  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase
      .channel(`jobs-${business.id}-${suffix}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const match = (row) =>
            (!clientId || row.client_id === clientId) &&
            (!premisesId || row.premises_id === premisesId) &&
            (!divisionSlug || row.division_slug === divisionSlug) &&
            (!status || row.status === status)
          setJobs(prev => {
            if (payload.eventType === 'INSERT') {
              if (!match(payload.new)) return prev
              if (prev.some(j => j.id === payload.new.id)) return prev
              return [payload.new, ...prev].sort(byScheduledDateDesc)
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(j => j.id === payload.new.id ? payload.new : j).filter(match).sort(byScheduledDateDesc)
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(j => j.id !== payload.old.id)
            }
            return prev
          })
        })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business, clientId, premisesId, divisionSlug, status])

  const createJob = useCallback(async (payload) => {
    if (!business) throw new Error('No business loaded')
    const row = {
      business_id: business.id,
      division_slug: payload.division_slug,
      client_id: payload.client_id,
      premises_id: payload.premises_id || null,
      title: payload.title?.trim(),
      description: payload.description?.trim() || null,
      job_type: payload.job_type || null,
      status: 'scheduled',
      scheduled_date: payload.scheduled_date || null,
      scheduled_duration_minutes: payload.scheduled_duration_minutes ?? null,
      assigned_staff_id: payload.assigned_staff_id || null,
      price: payload.price ?? null,
      recurring_profile_id: payload.recurring_profile_id || null,
    }
    const { data, error } = await supabase.from('jobs').insert(row).select().single()
    if (error) throw error
    setJobs(prev => (prev.some(j => j.id === data.id) ? prev : [data, ...prev].sort(byScheduledDateDesc)))
    logActivity({
      business_id: business.id,
      division_slug: data.division_slug,
      event_type: 'job_created',
      title: `Job scheduled: ${data.title}`,
      subtitle: data.scheduled_date ? new Date(data.scheduled_date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'No date set',
      entity_type: 'job',
      entity_id: data.id,
    })
    return data
  }, [business])

  const updateJob = useCallback(async (id, patch) => {
    const clean = { ...patch }
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k])
    const { data, error } = await supabase.from('jobs').update(clean).eq('id', id).select().single()
    if (error) throw error
    setJobs(prev => prev.map(j => j.id === data.id ? data : j))
    return data
  }, [])

  const deleteJob = useCallback(async (id) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) throw error
    setJobs(prev => prev.filter(j => j.id !== id))
  }, [])

  const updateJobStatus = useCallback(async (jobId, nextStatus) => {
    const patch = { status: nextStatus }
    if (nextStatus === 'in_progress') patch.started_at = new Date().toISOString()
    if (nextStatus === 'completed') patch.completed_at = new Date().toISOString()
    const { data, error } = await supabase.from('jobs').update(patch).eq('id', jobId).select().single()
    if (error) throw error
    setJobs(prev => prev.map(j => j.id === data.id ? data : j))
    if (nextStatus === 'completed' && business) {
      logActivity({
        business_id: business.id,
        division_slug: data.division_slug,
        event_type: 'job_completed',
        title: `Job completed: ${data.title}`,
        entity_type: 'job',
        entity_id: data.id,
      })
    }
    return data
  }, [business])

  return { jobs, loading, error, refetch, createJob, updateJob, updateJobStatus, deleteJob }
}

function byScheduledDateDesc(a, b) {
  const da = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0
  const db = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0
  return db - da
}

export function useJob(id) {
  const { business } = useBusiness()
  const [job, setJob] = useState(null)
  const [client, setClient] = useState(null)
  const [premises, setPremises] = useState(null)
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!business || !id) return
    setLoading(true)
    const { data: j } = await supabase.from('jobs').select('*').eq('id', id).eq('business_id', business.id).maybeSingle()
    setJob(j ?? null)
    if (j) {
      const [clientRes, premisesRes, staffRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', j.client_id).maybeSingle(),
        j.premises_id ? supabase.from('premises').select('*').eq('id', j.premises_id).maybeSingle() : Promise.resolve({ data: null }),
        j.assigned_staff_id ? supabase.from('staff_members').select('*').eq('id', j.assigned_staff_id).maybeSingle() : Promise.resolve({ data: null }),
      ])
      setClient(clientRes.data)
      setPremises(premisesRes.data)
      setStaff(staffRes.data)
    } else {
      setClient(null); setPremises(null); setStaff(null)
    }
    setLoading(false)
  }, [business, id])

  useEffect(() => { refetch() }, [refetch])

  return { job, client, premises, staff, loading, refetch, setJob }
}
