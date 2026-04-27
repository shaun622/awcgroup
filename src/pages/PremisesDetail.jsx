import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Building2, MapPin, Phone, Edit3, Trash2, Plus,
  Flame, Briefcase, ShieldCheck, Clock, AlertTriangle,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import StatCard from '../components/ui/StatCard'
import EmptyState from '../components/ui/EmptyState'
import DivisionChip from '../components/ui/DivisionChip'
import { SkeletonCard, SkeletonList } from '../components/ui/Skeleton'
import AddPremisesModal from '../components/ui/AddPremisesModal'
import AddFireDoorModal from '../components/ui/AddFireDoorModal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { usePremises } from '../hooks/usePremises'
import { useFireDoors } from '../hooks/useFireDoors'
import { cn, formatDate, statusLabel } from '../lib/utils'

export default function PremisesDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { business } = useBusiness()

  const [premises, setPremises] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Inline fetch — single record + parent client. Could be extracted later.
  useEffect(() => {
    if (!business || !id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data: p } = await supabase
        .from('premises').select('*')
        .eq('id', id).eq('business_id', business.id).maybeSingle()
      if (cancelled) return
      setPremises(p ?? null)
      if (p) {
        const { data: c } = await supabase
          .from('clients').select('*')
          .eq('id', p.client_id).maybeSingle()
        if (!cancelled) setClient(c ?? null)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [business, id])

  // Mutations from the multi-record hook (we only use update/delete here)
  const { updatePremises, deletePremises } = usePremises({ clientId: premises?.client_id })

  if (loading) {
    return <PageWrapper size="xl"><SkeletonCard /></PageWrapper>
  }
  if (!premises) {
    return (
      <PageWrapper size="xl">
        <EmptyState
          icon={MapPin}
          title="Premises not found"
          description="This site may have been deleted or you don't have access."
        />
      </PageWrapper>
    )
  }

  const isFire = premises.division_slug === 'fire'
  const addr = [premises.address_line_1, premises.address_line_2, premises.city, premises.postcode].filter(Boolean).join(', ')

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate(client ? `/clients/${client.id}` : '/clients')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> {client?.name ?? 'Clients'}
      </button>

      {/* Header card */}
      <Card className="!p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <DivisionChip slug={premises.division_slug} variant="soft" size="sm" />
                  <Badge variant="default">{statusLabel(premises.site_type)}</Badge>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">
                  {premises.name || addr || 'Untitled premises'}
                </h1>
                {premises.name && addr && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{addr}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditOpen(true)}
                  className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Edit premises"
                  title="Edit premises"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  aria-label="Delete premises"
                  title="Delete premises"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {premises.access_notes && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {premises.access_notes}
              </p>
            )}
          </div>
        </div>
      </Card>

      <AddPremisesModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
        editing={premises}
        updatePremises={updatePremises}
        onCreated={(p) => setPremises(p)}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${premises.name || addr}?`}
        description="Deletes the premises plus any fire doors, jobs and reports tied to it. Cannot be undone."
        confirmLabel="Delete premises"
        onConfirm={async () => {
          await deletePremises(premises.id)
          toast.success('Premises deleted')
          navigate(client ? `/clients/${client.id}` : '/clients')
        }}
      />

      {/* Fire doors section — only for fire-division premises */}
      {isFire && <FireDoorsSection premises={premises} />}
    </PageWrapper>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */

function FireDoorsSection({ premises }) {
  const navigate = useNavigate()
  const { fireDoors, loading, addFireDoor, updateFireDoor, deleteFireDoor } = useFireDoors({ premisesId: premises.id })

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const stats = useMemo(() => {
    const total = fireDoors.length
    const overdue = fireDoors.filter(d => d.next_due_at && new Date(d.next_due_at) < new Date()).length
    return { total, overdue }
  }, [fireDoors])

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Flame className="w-5 h-5 text-fire-500" />
          Fire doors
        </h2>
        {fireDoors.length > 0 && (
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
            Add door
          </Button>
        )}
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : fireDoors.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No fire doors registered yet"
          description="Add the first door for this building. Each door becomes a permanent register entry that gets re-assessed on schedule."
          action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add door</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard label="Doors" value={stats.total} icon={Flame} />
            <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle}
              trend={stats.overdue > 0 ? -1 : 0}
              trendLabel={stats.overdue > 0 ? 'Re-inspection due' : 'All on schedule'} />
            <StatCard label="Last assessment" value={0} icon={ShieldCheck}
              trendLabel="Coming next commit" />
            <StatCard label="Pass rate" value={0} icon={Briefcase}
              trendLabel="Coming next commit" />
          </div>

          <div className="space-y-3">
            {fireDoors.map(d => (
              <FireDoorCard
                key={d.id}
                door={d}
                onClick={() => navigate(`/premises/${premises.id}/doors/${d.id}`)}
                onEdit={() => setEditing(d)}
                onDelete={() => setDeleting(d)}
              />
            ))}
          </div>
        </>
      )}

      <AddFireDoorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        premises={premises}
        existingDoors={fireDoors}
        addFireDoor={addFireDoor}
      />
      <AddFireDoorModal
        open={!!editing}
        onClose={() => setEditing(null)}
        premises={premises}
        existingDoors={fireDoors}
        editing={editing}
        updateFireDoor={updateFireDoor}
      />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.ref || 'door'}?`}
        description="Deletes the door and all its assessment history. Cannot be undone."
        confirmLabel="Delete door"
        onConfirm={async () => {
          await deleteFireDoor(deleting.id)
          toast.success('Door deleted')
        }}
      />
    </section>
  )
}

function FireDoorCard({ door, onClick, onEdit, onDelete }) {
  const ratingLabel = door.rating === 'custom' ? door.rating_custom : door.rating
  const overdue = door.next_due_at && new Date(door.next_due_at) < new Date()
  return (
    <Card onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          'bg-fire-50 text-fire-600 dark:bg-fire-950/40 dark:text-fire-400',
        )}>
          <Flame className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{door.ref}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {[door.location, door.floor && `Floor ${door.floor}`].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {ratingLabel && <Badge variant="primary">{ratingLabel}</Badge>}
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Edit door"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                aria-label="Delete door"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {(door.next_due_at || door.reinspection_frequency) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {door.next_due_at && (
                <span className={cn(
                  'inline-flex items-center gap-1',
                  overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400',
                )}>
                  <Clock className="w-3 h-3" />
                  {overdue ? 'Overdue: ' : 'Next: '}{formatDate(door.next_due_at)}
                </span>
              )}
              {door.reinspection_frequency && (
                <span className="text-gray-500 dark:text-gray-400">{statusLabel(door.reinspection_frequency)} cadence</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
