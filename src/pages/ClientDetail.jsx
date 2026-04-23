import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, Edit3, Building2, Briefcase, Receipt, Activity, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'
import { useClient } from '../hooks/useClients'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, statusLabel, statusVariant } from '../lib/utils'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'premises', label: 'Premises', icon: MapPin },
  { id: 'jobs',     label: 'Jobs',     icon: Briefcase },
  { id: 'quotes',   label: 'Quotes',   icon: Receipt },
  { id: 'activity', label: 'Activity', icon: Activity },
]

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { client, loading } = useClient(id)
  const [tab, setTab] = useState('overview')
  const { currentDivision } = useDivision()

  if (loading) {
    return <PageWrapper size="xl"><SkeletonCard /></PageWrapper>
  }

  if (!client) {
    return (
      <PageWrapper size="xl">
        <EmptyState title="Client not found" description="This client may have been deleted or you don't have access." />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper size="xl">
      {/* Back */}
      <button
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Clients
      </button>

      {/* Header */}
      <Card className="!p-5 mb-4">
        <div className="flex items-start gap-4">
          <Avatar name={client.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">{client.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{statusLabel(client.client_type)}</p>
              </div>
              <Badge variant={statusVariant(client.pipeline_stage)}>
                {statusLabel(client.pipeline_stage)}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-600">
                  <Phone className="w-3.5 h-3.5" /> {client.phone}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-brand-600">
                  <Mail className="w-3.5 h-3.5" /> {client.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 mb-4 overflow-x-auto scrollbar-none">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                active
                  ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Address"
              value={[client.address_line_1, client.address_line_2, client.city, client.postcode].filter(Boolean).join(', ') || '—'} />
            <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={client.phone || '—'} />
            <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={client.email || '—'} />
          </Card>

          {client.notes && (
            <Card>
              <p className="section-title mb-2">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{client.notes}</p>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<Edit3 className="w-4 h-4" />}>Edit client</Button>
          </div>
        </div>
      )}

      {tab === 'premises' && (
        <EmptyState
          icon={MapPin}
          title="No premises yet"
          description={currentDivision
            ? `Add a ${currentDivision.name.toLowerCase()} site for this client.`
            : 'Add the first site for this client — division-tagged.'}
          action={<Button leftIcon={<Plus className="w-4 h-4" />}>Add premises</Button>}
        />
      )}

      {tab === 'jobs' && (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Create a job for this client from the Jobs page, or from a premises once added."
        />
      )}

      {tab === 'quotes' && (
        <EmptyState
          icon={Receipt}
          title="No quotes yet"
          description="Draft a quote for this client — it'll show here, division-tagged."
        />
      )}

      {tab === 'activity' && (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Everything related to this client — quotes sent, jobs completed, reports filed — will appear here as it happens."
        />
      )}
    </PageWrapper>
  )
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{value || '—'}</div>
      </div>
    </div>
  )
}
