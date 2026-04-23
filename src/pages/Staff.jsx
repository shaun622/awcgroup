import { useState } from 'react'
import { ArrowLeft, Plus, Users, Shield, Phone, Mail } from 'lucide-react'
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
import { statusLabel } from '../lib/utils'

export default function Staff() {
  const navigate = useNavigate()
  const { staff, loading } = useStaff()
  const [addOpen, setAddOpen] = useState(false)

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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{staff.length} {staff.length === 1 ? 'person' : 'people'}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add staff
        </Button>
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff yet"
          description="Add your techs — they'll be selectable when assigning jobs."
          action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Add your first tech</Button>}
        />
      ) : (
        <div className="space-y-3">
          {staff.map(s => (
            <Card key={s.id}>
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
                  {(s.role === 'admin' || s.role === 'owner') && (
                    <p className="mt-2 text-xs text-gray-500">Sees all divisions</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} />
    </PageWrapper>
  )
}
