import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'

/**
 * useJobReport — loads the report for a given job (or creates a draft),
 * plus task checklist + photos. Provides mutations to update any of those.
 */
export function useJobReport(jobId) {
  const { business } = useBusiness()
  const [report, setReport] = useState(null)
  const [tasks, setTasks] = useState([])
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!business || !jobId) return
    setLoading(true)
    const { data: r } = await supabase
      .from('job_reports')
      .select('*')
      .eq('job_id', jobId)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setReport(r ?? null)

    if (r) {
      const [taskRes, photoRes] = await Promise.all([
        supabase.from('job_tasks').select('*').eq('job_report_id', r.id).order('sort_order'),
        supabase.from('job_photos').select('*').eq('job_report_id', r.id).order('created_at'),
      ])
      setTasks(taskRes.data ?? [])
      setPhotos(photoRes.data ?? [])
    } else {
      setTasks([])
      setPhotos([])
    }
    setLoading(false)
  }, [business, jobId])

  useEffect(() => { refetch() }, [refetch])

  /** Create a draft report for this job + seed tasks from the job type template */
  const startReport = useCallback(async ({ divisionSlug, premisesId, staffId, technicianName, taskNames }) => {
    const { data: r, error } = await supabase
      .from('job_reports')
      .insert({
        business_id: business.id,
        division_slug: divisionSlug,
        job_id: jobId,
        premises_id: premisesId ?? null,
        staff_id: staffId ?? null,
        technician_name: technicianName ?? null,
        status: 'in_progress',
        report_data: {},
      })
      .select()
      .single()
    if (error) throw error

    if (taskNames?.length) {
      const rows = taskNames.map((name, i) => ({
        job_report_id: r.id,
        task_name: name,
        completed: false,
        sort_order: i,
      }))
      const { data: t } = await supabase.from('job_tasks').insert(rows).select().order('sort_order')
      setTasks(t ?? [])
    }

    setReport(r)
    return r
  }, [business, jobId])

  const updateReport = useCallback(async (patch) => {
    if (!report) return
    const { data, error } = await supabase
      .from('job_reports')
      .update(patch)
      .eq('id', report.id)
      .select()
      .single()
    if (error) throw error
    setReport(data)
    return data
  }, [report])

  const toggleTask = useCallback(async (taskId, completed) => {
    // Optimistic
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } : t))
    const { error } = await supabase.from('job_tasks').update({ completed }).eq('id', taskId)
    if (error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !completed } : t))
      throw error
    }
  }, [])

  const uploadPhoto = useCallback(async (file, { tag = 'after', caption } = {}) => {
    if (!report) throw new Error('No report yet')
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const path = `${business.id}/${jobId}/${report.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: upErr } = await supabase.storage.from('job-photos').upload(path, file, { contentType: file.type })
    if (upErr) throw upErr

    const { data: urlData } = await supabase.storage.from('job-photos').createSignedUrl(path, 60 * 60 * 24 * 30)

    const { data: row, error: insErr } = await supabase
      .from('job_photos')
      .insert({
        job_report_id: report.id,
        storage_path: path,
        signed_url: urlData?.signedUrl ?? null,
        tag,
        caption: caption ?? null,
      })
      .select()
      .single()
    if (insErr) throw insErr

    setPhotos(prev => [...prev, row])
    return row
  }, [business, jobId, report])

  const removePhoto = useCallback(async (photoId) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return
    setPhotos(prev => prev.filter(p => p.id !== photoId))
    await supabase.storage.from('job-photos').remove([photo.storage_path]).catch(() => {})
    await supabase.from('job_photos').delete().eq('id', photoId)
  }, [photos])

  const completeReport = useCallback(async () => {
    return updateReport({ status: 'completed', completed_at: new Date().toISOString() })
  }, [updateReport])

  return { report, tasks, photos, loading, refetch, startReport, updateReport, toggleTask, uploadPhoto, removePhoto, completeReport }
}
