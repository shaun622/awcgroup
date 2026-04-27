import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, ClipboardList, Camera, FileText, CheckCircle2, Check, X, Upload, Trash2, Loader2,
  Flame, ShieldCheck, ChevronRight, Plus,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { TextArea } from '../components/ui/Input'
import DynamicField from '../components/ui/DynamicField'
import DivisionChip from '../components/ui/DivisionChip'
import { SkeletonCard } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import AddFireDoorModal from '../components/ui/AddFireDoorModal'
import { useJob, useJobs } from '../hooks/useJobs'
import { useJobReport } from '../hooks/useJobReport'
import { useFireDoors } from '../hooks/useFireDoors'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useBusiness } from '../contexts/BusinessContext'
import { getReportSchema } from '../lib/divisionReportSchemas'
import { cn } from '../lib/utils'

const PHOTO_TAGS = ['before', 'during', 'after', 'defect', 'evidence']

export default function NewJobReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { job, client, premises, staff, loading: jobLoading } = useJob(id)
  const { updateJobStatus } = useJobs()
  const { user } = useAuth()
  const { business } = useBusiness()
  const {
    report, tasks, photos, loading: reportLoading,
    startReport, updateReport, toggleTask, uploadPhoto, removePhoto, completeReport,
  } = useJobReport(id)

  const [reportData, setReportData] = useState({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadTag, setUploadTag] = useState('after')
  const fileInput = useRef(null)
  const startedRef = useRef(false)

  // Sync report_data + notes into local state when report loads
  useEffect(() => {
    if (report) {
      setReportData(report.report_data ?? {})
      setNotes(report.notes ?? '')
    }
  }, [report?.id])

  // Auto-start a report the first time — seed tasks from the matching job type template
  useEffect(() => {
    if (reportLoading || jobLoading || !job || report || startedRef.current) return
    startedRef.current = true
    ;(async () => {
      try {
        let taskNames = []
        if (job.job_type) {
          const { data: template } = await supabase
            .from('job_type_templates')
            .select('default_tasks')
            .eq('business_id', business.id)
            .eq('division_slug', job.division_slug)
            .eq('name', job.job_type)
            .maybeSingle()
          taskNames = (template?.default_tasks ?? []).filter(Boolean)
        }
        await startReport({
          divisionSlug: job.division_slug,
          premisesId: job.premises_id,
          staffId: job.assigned_staff_id,
          technicianName: staff?.name ?? user?.email ?? null,
          taskNames,
        })
      } catch (err) {
        toast.error('Could not start report', { description: err.message })
      }
    })()
  }, [reportLoading, jobLoading, job, report, business, staff, user, startReport])

  if (jobLoading || reportLoading) {
    return <PageWrapper size="xl"><SkeletonCard /></PageWrapper>
  }

  if (!job) {
    return <PageWrapper size="xl"><p className="text-sm text-gray-500">Job not found.</p></PageWrapper>
  }

  const schema = getReportSchema(job.division_slug)
  const allTasksDone = tasks.length > 0 && tasks.every(t => t.completed)

  const saveDraft = async () => {
    if (!report) return
    setSubmitting(true)
    try {
      await updateReport({ report_data: reportData, notes })
      toast.success('Saved')
    } catch (err) {
      toast.error('Save failed', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const submit = async () => {
    if (!report) return
    setSubmitting(true)
    try {
      await updateReport({ report_data: reportData, notes })
      const saved = await completeReport()
      // Transition the job to completed if it isn't already
      if (job.status !== 'completed') {
        await updateJobStatus(job.id, 'completed')
      }
      // Fire the email edge function. Non-blocking — if it's not deployed yet
      // the report is still saved, just no email goes out.
      supabase.functions.invoke('complete-job-report', { body: { job_report_id: saved?.id ?? report.id } })
        .then(res => {
          if (res.error) console.warn('[complete-job-report]', res.error)
        })
        .catch(err => console.warn('[complete-job-report]', err))
      toast.success('Job report submitted', { description: 'Job marked as completed.' })
      navigate(`/jobs/${job.id}`)
    } catch (err) {
      toast.error('Could not submit', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const onFilesPicked = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        await uploadPhoto(file, { tag: uploadTag })
      }
      toast.success(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded`)
    } catch (err) {
      toast.error('Upload failed', { description: err.message })
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate(`/jobs/${id}`)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back to job
      </button>

      <div className="flex items-center gap-2 mb-2">
        <DivisionChip slug={job.division_slug} variant="soft" size="sm" />
        <span className="text-xs text-gray-500">{schema.heading}</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{job.title}</h1>
      {client && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {client.name}{premises ? ` · ${premises.name ?? premises.address_line_1}` : ''}
        </p>
      )}

      {/* Fire-door assessments — only for fire-division jobs at premises with registered doors */}
      {job.division_slug === 'fire' && job.premises_id && (
        <FireDoorsForJobSection premisesId={job.premises_id} premises={premises} />
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <section className="mt-5">
          <h2 className="section-title mb-2 flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5" /> Task checklist
            <span className="ml-auto text-[11px] normal-case font-normal tracking-normal text-gray-400">
              {tasks.filter(t => t.completed).length}/{tasks.length} done
            </span>
          </h2>
          <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
            {tasks.map(t => (
              <label key={t.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/40 first:rounded-t-2xl last:rounded-b-2xl">
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={e => toggleTask(t.id, e.target.checked).catch(err => toast.error(err.message))}
                  className="mt-0.5 w-4 h-4 rounded accent-brand-500"
                />
                <span className={cn('text-sm', t.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100')}>
                  {t.task_name}
                </span>
              </label>
            ))}
          </Card>
        </section>
      )}

      {/* Division fields */}
      {schema.fields.length > 0 && (
        <section className="mt-5">
          <h2 className="section-title mb-2 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> {schema.heading}
          </h2>
          <Card className="space-y-4">
            {schema.fields.map(field => (
              <DynamicField
                key={field.key}
                field={field}
                value={reportData[field.key]}
                onChange={(v) => setReportData(d => ({ ...d, [field.key]: v }))}
              />
            ))}
          </Card>
        </section>
      )}

      {/* Notes */}
      <section className="mt-5">
        <h2 className="section-title mb-2">Notes</h2>
        <Card>
          <TextArea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything else worth recording…"
          />
        </Card>
      </section>

      {/* Photos */}
      <section className="mt-5">
        <h2 className="section-title mb-2 flex items-center gap-2">
          <Camera className="w-3.5 h-3.5" /> Photos
          <span className="ml-auto text-[11px] normal-case font-normal tracking-normal text-gray-400">{photos.length}</span>
        </h2>
        <Card>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <label className="text-xs text-gray-500">Tag</label>
            {PHOTO_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setUploadTag(tag)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all',
                  uploadTag === tag
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                )}
              >
                {tag}
              </button>
            ))}
            <div className="ml-auto">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={onFilesPicked}
              />
              <Button
                variant="secondary"
                size="sm"
                leftIcon={uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                onClick={() => fileInput.current?.click()}
                disabled={uploading || !report}
              >
                {uploading ? 'Uploading…' : 'Add photos'}
              </Button>
            </div>
          </div>

          {photos.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map(p => (
                <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {p.signed_url ? (
                    <img src={p.signed_url} alt={p.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No preview</div>
                  )}
                  <span className="absolute top-1 left-1 text-[10px] font-semibold uppercase rounded bg-black/60 text-white px-1.5 py-0.5">{p.tag}</span>
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Footer actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-2 sticky bottom-4 pt-2 pb-4 md:static">
        <Button variant="secondary" onClick={saveDraft} loading={submitting} className="flex-1">
          Save draft
        </Button>
        <Button onClick={submit} loading={submitting} leftIcon={<CheckCircle2 className="w-4 h-4" />} className="flex-1">
          {allTasksDone ? 'Submit & complete job' : 'Submit report'}
        </Button>
      </div>
    </PageWrapper>
  )
}

/* ─── Fire-door assessment bridge (fire-division jobs only) ─────────── */

function FireDoorsForJobSection({ premisesId, premises }) {
  const navigate = useNavigate()
  const { business } = useBusiness()
  const { fireDoors, loading, addFireDoor } = useFireDoors({ premisesId })
  const [latestByDoor, setLatestByDoor] = useState(new Map())
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!business || fireDoors.length === 0) { setLatestByDoor(new Map()); return }
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('fire_door_assessments')
        .select('id, fire_door_id, status, outcome, assessed_at')
        .eq('business_id', business.id)
        .in('fire_door_id', fireDoors.map(d => d.id))
        .order('assessed_at', { ascending: false })
      if (!alive) return
      const map = new Map()
      for (const a of data ?? []) {
        if (!map.has(a.fire_door_id)) map.set(a.fire_door_id, a)
      }
      setLatestByDoor(map)
    })()
    return () => { alive = false }
  }, [business, fireDoors])

  if (loading) return null

  return (
    <section className="mt-5">
      <h2 className="section-title mb-2 flex items-center gap-2">
        <Flame className="w-3.5 h-3.5 text-fire-500" /> Fire doors at this site
        <span className="ml-auto text-[11px] normal-case font-normal tracking-normal text-gray-400">
          {fireDoors.length} door{fireDoors.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline normal-case tracking-normal"
        >
          <Plus className="w-3 h-3" /> Add door
        </button>
      </h2>
      {fireDoors.length === 0 ? (
        <Card className="!p-4 border-dashed text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No doors registered for this site yet — add one to start an assessment.
          </p>
        </Card>
      ) : (
      <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
        {fireDoors.map(d => {
          const latest = latestByDoor.get(d.id)
          const inProgress = latest?.status === 'in_progress'
          const outcome = latest?.outcome
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => navigate(
                inProgress
                  ? `/premises/${premisesId}/doors/${d.id}/assess/${latest.id}`
                  : `/premises/${premisesId}/doors/${d.id}/assess/new`
              )}
              className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
            >
              <div className="w-9 h-9 rounded-xl bg-fire-50 dark:bg-fire-950/40 text-fire-600 dark:text-fire-400 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{d.ref}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {[d.location, d.floor && `Floor ${d.floor}`].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {inProgress
                  ? <Badge variant="warning">Resume</Badge>
                  : outcome
                    ? <Badge variant={outcome === 'pass' ? 'success' : outcome === 'fail' ? 'danger' : 'warning'}>
                        Last: {outcome === 'pass' ? 'Pass' : outcome === 'fail' ? 'Fail' : 'Investig.'}
                      </Badge>
                    : <Badge variant="default">Not assessed</Badge>}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          )
        })}
      </Card>
      )}

      <AddFireDoorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        premises={premises}
        existingDoors={fireDoors}
        addFireDoor={addFireDoor}
      />
    </section>
  )
}
