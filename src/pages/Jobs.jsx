import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, CalendarClock, User, MapPin } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import DivisionChip, { DivisionDot } from '../components/ui/DivisionChip'
import NewJobModal from '../components/ui/NewJobModal'
import FilterChips from '../components/ui/FilterChips'
import { useJobs } from '../hooks/useJobs'
import { useClients } from '../hooks/useClients'
import { usePremises } from '../hooks/usePremises'
import { useStaff } from '../hooks/useStaff'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, formatTime, formatRelative, statusLabel, statusVariant, formatGBP, JOB_STATUSES } from '../lib/utils'

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  ...JOB_STATUSES.map(s => ({ value: s, label: statusLabel(s) })),
]

export default function Jobs() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const [statusFilter, setStatusFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)

  const { jobs, loading, createJob } = useJobs({
    divisionSlug,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })
  const { allClients } = useClients()
  const { premises } = usePremises({ divisionSlug })
  const { staff } = useStaff({ divisionSlug })

  const clientById = useMemo(() => {
    const m = new Map(); allClients.forEach(c => m.set(c.id, c)); return m
  }, [allClients])
  const premisesById = useMemo(() => {
    const m = new Map(); premises.forEach(p => m.set(p.id, p)); return m
  }, [premises])
  const staffById = useMemo(() => {
    const m = new Map(); staff.forEach(s => m.set(s.id, s)); return m
  }, [staff])

  const scopeLabel = isGroupView ? 'All divisions' : currentDivision?.name

  return (
    <PageWrapper size="xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Jobs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{scopeLabel}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Schedule job
        </Button>
      </div>

      <FilterChips
        className="mb-4"
        options={STATUS_FILTERS}
        value={statusFilter}
        onChange={setStatusFilter}
        ariaLabel="Job status filter"
      />

      {loading ? (
        <SkeletonList count={3} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={statusFilter === 'all' ? 'No jobs yet' : `No ${statusLabel(statusFilter).toLowerCase()} jobs`}
          description={statusFilter === 'all'
            ? 'Schedule your first job to get things moving.'
            : `Nothing in the ${statusLabel(statusFilter).toLowerCase()} pile right now.`}
          action={statusFilter === 'all' && (
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
              Schedule a job
            </Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              client={clientById.get(job.client_id)}
              premises={premisesById.get(job.premises_id)}
              staff={staffById.get(job.assigned_staff_id)}
              onClick={() => navigate(`/jobs/${job.id}`)}
            />
          ))}
        </div>
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

function JobCard({ job, client, premises, staff, onClick }) {
  return (
    <Card onClick={onClick}>
      <div className="flex items-start gap-3">
        <DivisionDot slug={job.division_slug} className="mt-2" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{job.title}</p>
              {client && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {client.name}{premises ? ` · ${premises.name ?? premises.address_line_1}` : ''}
                </p>
              )}
            </div>
            <Badge variant={statusVariant(job.status)} className="shrink-0">
              {statusLabel(job.status)}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {job.scheduled_date && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> {formatDate(job.scheduled_date)} · {formatTime(job.scheduled_date)}
              </span>
            )}
            {job.price != null && (
              <span className="inline-flex items-center gap-1 tabular-nums">{formatGBP(job.price)}</span>
            )}
            {staff && (
              <span className="inline-flex items-center gap-1">
                <Avatar name={staff.name} size="xs" /> {staff.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
