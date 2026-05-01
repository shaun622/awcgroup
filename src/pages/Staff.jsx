import { useState, useMemo } from 'react'
import { ArrowLeft, Plus, Users, Shield, Wrench, Phone, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import DivisionChip from '../components/ui/DivisionChip'
import { SkeletonList } from '../components/ui/Skeleton'
import AddStaffModal from '../components/ui/AddStaffModal'
import { useStaff } from '../hooks/useStaff'
import { useBusiness } from '../contexts/BusinessContext'
import { useAuth } from '../contexts/AuthContext'
import { statusLabel, cn } from '../lib/utils'

// AWC role tiers. Admin/owner see all divisions and manage everything;
// techs are field-only and division-scoped.
const ADMIN_ROLES = new Set(['admin', 'owner'])
const isAdminRole = (role) => ADMIN_ROLES.has((role || '').toLowerCase())

export default function Staff() {
  const navigate = useNavigate()
  const { staff, loading } = useStaff()
  // staffLimit comes from BusinessContext: businesses.staff_seat_override
  // (HQ admin override) ?? plans.max_staff for the current plan ?? 1.
  // One set of seats covers all four AWC divisions.
  const { business, staffLimit } = useBusiness()
  const { user } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  // The tier the operator clicked "Add" from — drives the AddStaffModal's
  // default role pick (admin or tech).
  const [addRoleHint, setAddRoleHint] = useState('tech')

  // Virtualise the business owner so they appear in Admin & staff. The
  // owner lives in businesses.owner_id, NOT staff_members. Render-only
  // when the current viewer is the owner (we have their email from auth).
  const ownerVirtual = useMemo(() => {
    if (!user || !business?.owner_id || user.id !== business.owner_id) return null
    return {
      id: `__owner__:${business.owner_id}`,
      name: user.email,
      email: user.email,
      phone: null,
      role: 'owner',
      photo_url: null,
      divisions: [],
      _virtual: true,
    }
  }, [user, business?.owner_id])

  // Group into admins (owner virtual + admin role rows) vs techs.
  const { admins, technicians } = useMemo(() => {
    const admins = ownerVirtual ? [ownerVirtual] : []
    const technicians = []
    for (const m of staff) {
      if (ownerVirtual && m.user_id === business?.owner_id) continue
      if (isAdminRole(m.role)) admins.push(m)
      else technicians.push(m)
    }
    return { admins, technicians }
  }, [staff, ownerVirtual, business?.owner_id])

  // Active count — exclude the virtual owner since they don't consume
  // a seat against the plan limit.
  const activeCount = admins.filter(m => !m._virtual).length + technicians.length
  const canAdd = activeCount < staffLimit

  function openAdd(roleHint) {
    setAddRoleHint(roleHint)
    setAddOpen(true)
  }

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate('/settings')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Settings
      </button>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Staff</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
            {activeCount} of {staffLimit} {staffLimit === 1 ? 'seat' : 'seats'} used
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : staff.length === 0 && !ownerVirtual ? (
        <EmptyState
          icon={Users}
          title="No staff yet"
          description="Add your techs — they'll be selectable when assigning jobs."
          action={<Button onClick={() => openAdd('tech')} leftIcon={<Plus className="w-4 h-4" />}>Add your first tech</Button>}
        />
      ) : (
        <div className="space-y-4">
          {/* ── ADMIN & STAFF ── */}
          <RoleSection
            icon={Shield}
            label="Admin & staff"
            description="People who log in to manage clients, jobs, and billing across all divisions"
            members={admins}
            onAdd={() => openAdd('admin')}
            emptyText="No admins yet besides the account owner. Add managers here."
            canAdd={canAdd}
          />

          {/* ── TECHNICIANS ── */}
          <RoleSection
            icon={Wrench}
            label="Technicians"
            description="Field workers — division-scoped, mobile-first view"
            members={technicians}
            onAdd={() => openAdd('tech')}
            emptyText="No technicians yet. Add the people who do the field work."
            canAdd={canAdd}
          />
        </div>
      )}

      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} defaultRole={addRoleHint} />
    </PageWrapper>
  )
}

// ─── Section card for a role group ─────────────────
function RoleSection({ icon: Icon, label, description, members, onAdd, emptyText, canAdd }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-700 dark:text-gray-300 inline-flex items-center gap-2">
            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
            {label}
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold tabular-nums text-gray-600 dark:text-gray-400">
              {members.length}
            </span>
          </p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <button
          onClick={onAdd}
          disabled={!canAdd}
          className={cn(
            'inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold transition-colors shrink-0',
            canAdd
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed',
          )}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          {canAdd ? 'Add' : 'Limit'}
        </button>
      </div>
      {members.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-600 italic">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {members.map(s => (
            <li key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={s.name} size="md" src={s.photo_url} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {s.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                        {s.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                      </div>
                    </div>
                    <Badge variant={s.role === 'owner' ? 'primary' : s.role === 'admin' ? 'warning' : 'default'} className="shrink-0">
                      <Shield className="w-3 h-3" /> {statusLabel(s.role)}
                    </Badge>
                  </div>
                  {s.role === 'tech' && s.divisions?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.divisions.map(slug => (
                        <DivisionChip key={slug} slug={slug} size="sm" variant="soft" />
                      ))}
                    </div>
                  )}
                  {isAdminRole(s.role) && !s._virtual && (
                    <p className="mt-2 text-xs text-gray-500">Sees all divisions</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
