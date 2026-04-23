import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, CalendarClock, Clock, PoundSterling, Briefcase, Building2, MapPin,
  User, Play, Pause, CheckCircle2, XCircle, FileText, ChevronRight,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'
import DivisionChip from '../components/ui/DivisionChip'
import { useJob, useJobs } from '../hooks/useJobs'
import { cn, formatDateTime, formatGBP, statusLabel, statusVariant } from '../lib/utils'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { job, client, premises, staff, loading, refetch } = useJob(id)
  const { updateJobStatus } = useJobs()

  const [updating, setUpdating] = useState(false)

  if (loading) return <PageWrapper size="xl"><SkeletonCard /></PageWrapper>

  if (!job) {
    return (
      <PageWrapper size="xl">
        <EmptyState title="Job not found" description="This job may have been deleted or you don't have access." />
      </PageWrapper>
    )
  }

  const setStatus = async (next) => {
    setUpdating(true)
    try {
      await updateJobStatus(job.id, next)
      await refetch()
      toast.success(`Marked as ${statusLabel(next).toLowerCase()}`)
    } catch (err) {
      toast.error('Could not update status', { description: err.message })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate('/jobs')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Jobs
      </button>

      {/* Header */}
      <Card className="!p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <DivisionChip slug={job.division_slug} variant="soft" size="sm" />
              <Badge variant={statusVariant(job.status)}>{statusLabel(job.status)}</Badge>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{job.title}</h1>
            {job.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{job.description}</p>
            )}
          </div>
          {job.price != null && (
            <p className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Price</span>
              <span className="block text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{formatGBP(job.price)}</span>
            </p>
          )}
        </div>
      </Card>

      {/* Status actions */}
      <StatusActions job={job} onChange={setStatus} disabled={updating} />

      {/* Context */}
      <div className="mt-4 space-y-3">
        <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
          <Row
            icon={<Building2 className="w-4 h-4" />}
            label="Client"
            value={client?.name ?? '—'}
            to={client ? `/clients/${client.id}` : null}
          />
          {premises && (
            <Row
              icon={<MapPin className="w-4 h-4" />}
              label="Premises"
              value={[premises.name, premises.address_line_1, premises.postcode].filter(Boolean).join(' · ')}
            />
          )}
          {job.job_type && (
            <Row icon={<Briefcase className="w-4 h-4" />} label="Type" value={job.job_type} />
          )}
          <Row
            icon={<CalendarClock className="w-4 h-4" />}
            label="Scheduled"
            value={job.scheduled_date ? formatDateTime(job.scheduled_date) : 'Not scheduled'}
          />
          {job.scheduled_duration_minutes && (
            <Row icon={<Clock className="w-4 h-4" />} label="Duration" value={`${job.scheduled_duration_minutes} min`} />
          )}
          <Row
            icon={<User className="w-4 h-4" />}
            label="Assigned to"
            value={staff ? (
              <span className="inline-flex items-center gap-2"><Avatar name={staff.name} size="xs" /> {staff.name}</span>
            ) : 'Unassigned'}
          />
        </Card>

        {job.status === 'completed' && (
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Job completed</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  {job.completed_at && `Finished ${formatDateTime(job.completed_at)}`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Future hook-in for item 4 (Job Reports) */}
        {['in_progress', 'completed'].includes(job.status) && (
          <Card className="opacity-60">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Job report</p>
                <p className="text-xs text-gray-500">Division-specific assessment form — coming soon.</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}

function StatusActions({ job, onChange, disabled }) {
  const btns = []
  if (job.status === 'scheduled') {
    btns.push({ label: 'Start job', next: 'in_progress', variant: 'primary', icon: Play })
    btns.push({ label: 'Cancel', next: 'cancelled', variant: 'secondary', icon: XCircle })
  } else if (job.status === 'in_progress') {
    btns.push({ label: 'Complete', next: 'completed', variant: 'primary', icon: CheckCircle2 })
    btns.push({ label: 'Put on hold', next: 'on_hold', variant: 'secondary', icon: Pause })
  } else if (job.status === 'on_hold') {
    btns.push({ label: 'Resume', next: 'in_progress', variant: 'primary', icon: Play })
    btns.push({ label: 'Cancel', next: 'cancelled', variant: 'secondary', icon: XCircle })
  } else if (job.status === 'completed' || job.status === 'cancelled') {
    btns.push({ label: 'Re-open', next: 'scheduled', variant: 'secondary', icon: Play })
  }

  return (
    <div className="flex gap-2">
      {btns.map(b => (
        <Button
          key={b.next}
          variant={b.variant}
          leftIcon={<b.icon className="w-4 h-4" />}
          onClick={() => onChange(b.next)}
          disabled={disabled}
          className="flex-1"
        >
          {b.label}
        </Button>
      ))}
    </div>
  )
}

function Row({ icon, label, value, to }) {
  const body = (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{value || '—'}</div>
      </div>
      {to && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
    </div>
  )
  return to ? <Link to={to} className="block hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors first:rounded-t-2xl last:rounded-b-2xl">{body}</Link> : body
}
