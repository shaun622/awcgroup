import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Repeat, Plus, Pause, Play, XCircle, CalendarClock, User } from 'lucide-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import { SkeletonList } from '../components/ui/Skeleton'
import { DivisionDot } from '../components/ui/DivisionChip'
import NewRecurringProfileModal from '../components/ui/NewRecurringProfileModal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { useRecurringProfiles, projectNextVisit } from '../hooks/useRecurringProfiles'
import { useClients } from '../hooks/useClients'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, formatGBP, statusLabel, statusVariant } from '../lib/utils'

const FILTERS = [
  { value: 'active',    label: 'Active' },
  { value: 'paused',    label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all',       label: 'All' },
]

export default function Recurring() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const [filter, setFilter] = useState('active')
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const { profiles, loading, createProfile, pauseProfile, resumeProfile, cancelProfile, deleteProfile } = useRecurringProfiles({
    divisionSlug,
    status: filter === 'all' ? undefined : filter,
  })
  const { allClients } = useClients()
  const clientById = useMemo(() => { const m = new Map(); allClients.forEach(c => m.set(c.id, c)); return m }, [allClients])

  return (
    <PageWrapper size="xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Recurring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Maintenance contracts · {isGroupView ? 'all divisions' : currentDivision?.name}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>New profile</Button>
      </div>

      <FilterChips className="mb-4" options={FILTERS} value={filter} onChange={setFilter} ariaLabel="Recurring status filter" />

      {loading ? (
        <SkeletonList count={2} />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={filter === 'active' ? 'No active contracts' : `No ${filter} profiles`}
          description="Set up a recurring visit for a client who's on a maintenance contract — it'll project onto the Schedule each cycle."
          action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Create profile</Button>}
        />
      ) : (
        <div className="space-y-3">
          {profiles.map(p => {
            const next = projectNextVisit(p)
            const client = clientById.get(p.client_id)
            return (
              <Card key={p.id}>
                <div className="flex items-start gap-3">
                  <DivisionDot slug={p.division_slug} className="mt-2" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {client?.name ?? '—'} · <span className="capitalize">{statusLabel(p.frequency)}</span>
                          {p.duration_type === 'num_visits' && ` · ${p.completed_visits}/${p.total_visits} done`}
                          {p.duration_type === 'until_date' && p.end_date && ` · until ${formatDate(p.end_date)}`}
                        </p>
                      </div>
                      <Badge variant={statusVariant(p.status)} className="shrink-0">{statusLabel(p.status)}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      {next && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" /> Next: {formatDate(next)}
                        </span>
                      )}
                      {p.price != null && <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">{formatGBP(p.price)} / visit</span>}
                    </div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {p.status === 'active' && (
                        <Button size="sm" variant="secondary" leftIcon={<Pause className="w-3.5 h-3.5" />} onClick={() => pauseProfile(p.id).then(() => toast.success('Paused'))}>Pause</Button>
                      )}
                      {p.status === 'paused' && (
                        <Button size="sm" leftIcon={<Play className="w-3.5 h-3.5" />} onClick={() => resumeProfile(p.id).then(() => toast.success('Resumed'))}>Resume</Button>
                      )}
                      {p.status !== 'cancelled' && p.status !== 'completed' && (
                        <Button size="sm" variant="secondary" leftIcon={<XCircle className="w-3.5 h-3.5" />} onClick={() => cancelProfile(p.id).then(() => toast.success('Cancelled'))}>Cancel</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(p)}>Delete</Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <NewRecurringProfileModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        createProfile={createProfile}
      />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.title ?? 'profile'}?`}
        description="Removes the profile. Already-scheduled jobs aren't affected."
        confirmLabel="Delete profile"
        onConfirm={async () => {
          await deleteProfile(deleting.id)
          toast.success('Profile deleted')
        }}
      />
    </PageWrapper>
  )
}
