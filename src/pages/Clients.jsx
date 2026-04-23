import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Search, MapPin, Phone, Mail } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import AddClientModal from '../components/ui/AddClientModal'
import { useClients } from '../hooks/useClients'
import { cn, formatRelative, statusVariant, statusLabel } from '../lib/utils'

export default function Clients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const { clients, loading, allClients, addClient } = useClients({ search })

  return (
    <PageWrapper size="xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Clients</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {allClients.length === 0 ? 'Your first client is a few clicks away.' : `${allClients.length} total — shared across all divisions`}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="shrink-0">
          Add client
        </Button>
      </div>

      {allClients.length > 0 && (
        <div className="mb-4">
          <Input
            leftAdornment={<Search className="w-4 h-4" />}
            placeholder="Search by name, email, phone, postcode…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="!pl-10"
          />
        </div>
      )}

      {loading ? (
        <SkeletonList count={3} />
      ) : allClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to start tracking premises, quotes and jobs across any division."
          action={<Button onClick={() => setAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Add your first client</Button>}
        />
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500">No matches for "{search}"</div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => (
            <Card key={client.id} onClick={() => navigate(`/clients/${client.id}`)}>
              <div className="flex items-start gap-3">
                <Avatar name={client.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{client.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{statusLabel(client.client_type)}</p>
                    </div>
                    <Badge variant={statusVariant(client.pipeline_stage)} className="shrink-0">
                      {statusLabel(client.pipeline_stage)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {client.phone && (
                      <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>
                    )}
                    {client.email && (
                      <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>
                    )}
                    {(client.city || client.postcode) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[client.city, client.postcode].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                  {formatRelative(client.created_at)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} addClient={addClient} />
    </PageWrapper>
  )
}
