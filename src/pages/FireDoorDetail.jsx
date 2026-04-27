import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Flame, Edit3, Trash2, ClipboardCheck, ShieldCheck,
  History, Clock,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'
import AddFireDoorModal from '../components/ui/AddFireDoorModal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { useFireDoor, useFireDoors } from '../hooks/useFireDoors'
import { formatDate, statusLabel, cn } from '../lib/utils'

export default function FireDoorDetail() {
  const { premisesId, doorId } = useParams()
  const navigate = useNavigate()
  const { door, premises, assessments, loading } = useFireDoor(doorId)
  const { fireDoors, updateFireDoor, deleteFireDoor } = useFireDoors({ premisesId })

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (loading) {
    return <PageWrapper size="xl"><SkeletonCard /></PageWrapper>
  }
  if (!door) {
    return (
      <PageWrapper size="xl">
        <EmptyState
          icon={Flame}
          title="Door not found"
          description="This door may have been deleted or you don't have access."
        />
      </PageWrapper>
    )
  }

  const ratingLabel = door.rating === 'custom' ? door.rating_custom : door.rating
  const overdue = door.next_due_at && new Date(door.next_due_at) < new Date()

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate(`/premises/${premisesId}`)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> {premises?.name || 'Premises'}
      </button>

      {/* Header */}
      <Card className="!p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-fire-50 dark:bg-fire-950/40 text-fire-600 dark:text-fire-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-fire-600 dark:text-fire-400 mb-1">Fire door</p>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">
                  {door.ref}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {[door.location, door.floor && `Floor ${door.floor}`].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditOpen(true)}
                  className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Edit door"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  aria-label="Delete door"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ratingLabel && <Badge variant="primary">{ratingLabel}</Badge>}
              {door.reinspection_frequency && (
                <Badge variant="default">{statusLabel(door.reinspection_frequency)} cadence</Badge>
              )}
              {door.next_due_at && (
                <Badge variant={overdue ? 'danger' : 'default'}>
                  <Clock className="w-3 h-3" />
                  {overdue ? 'Overdue: ' : 'Next: '}{formatDate(door.next_due_at)}
                </Badge>
              )}
            </div>

            {door.notes && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {door.notes}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Start assessment CTA */}
      <Card className="!p-5 mb-4 border-dashed">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Start a new assessment</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              71-item BS 8214:2016 checklist with dual sign-off
            </p>
          </div>
          <Button
            leftIcon={<ClipboardCheck className="w-4 h-4" />}
            onClick={() => navigate(`/premises/${premisesId}/doors/${doorId}/assess/new`)}
          >
            Start
          </Button>
        </div>
      </Card>

      {/* Assessment history */}
      <h2 className="section-title mb-2 flex items-center gap-2">
        <History className="w-3.5 h-3.5" strokeWidth={2.5} />
        Assessment history
      </h2>
      {assessments.length === 0 ? (
        <Card className="!p-5 text-sm text-gray-500 dark:text-gray-400 text-center">
          No assessments yet. The first inspection will appear here.
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map(a => (
            <Card key={a.id} onClick={() => navigate(`/premises/${premisesId}/doors/${doorId}/assess/${a.id}`)}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  a.outcome === 'pass' && 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
                  a.outcome === 'fail' && 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
                  (!a.outcome || a.outcome === 'needs_investigation') && 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
                )}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {formatDate(a.assessed_at)}
                      </p>
                      {a.assessor_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{a.assessor_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {a.status === 'in_progress'
                        ? <Badge variant="warning">In progress</Badge>
                        : a.outcome && (
                          <Badge variant={a.outcome === 'pass' ? 'success' : a.outcome === 'fail' ? 'danger' : 'warning'}>
                            {statusLabel(a.outcome)}
                          </Badge>
                        )}
                    </div>
                  </div>
                  {a.status === 'completed' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {a.pass_count} pass · {a.fail_count} fail · {a.na_count} N/A
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddFireDoorModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        premises={premises}
        existingDoors={fireDoors}
        editing={door}
        updateFireDoor={updateFireDoor}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${door.ref}?`}
        description="Deletes the door and all its assessment history. Cannot be undone."
        confirmLabel="Delete door"
        onConfirm={async () => {
          await deleteFireDoor(door.id)
          toast.success('Door deleted')
          navigate(`/premises/${premisesId}`)
        }}
      />
    </PageWrapper>
  )
}
