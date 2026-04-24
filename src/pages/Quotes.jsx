import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Plus, Calendar } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { DivisionDot } from '../components/ui/DivisionChip'
import FilterChips from '../components/ui/FilterChips'
import { useQuotes } from '../hooks/useQuotes'
import { useClients } from '../hooks/useClients'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, formatGBP, statusLabel, statusVariant, QUOTE_STATUSES } from '../lib/utils'

const FILTERS = [
  { value: 'all', label: 'All' },
  ...QUOTE_STATUSES.map(s => ({ value: s, label: statusLabel(s) })),
]

export default function Quotes() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const [filter, setFilter] = useState('all')
  const { quotes, loading } = useQuotes({ divisionSlug, status: filter === 'all' ? undefined : filter })
  const { allClients } = useClients()
  const clientById = useMemo(() => {
    const m = new Map(); allClients.forEach(c => m.set(c.id, c)); return m
  }, [allClients])

  return (
    <PageWrapper size="xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Quotes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isGroupView ? 'All divisions' : currentDivision?.name}
          </p>
        </div>
        <Button onClick={() => navigate('/quotes/new')} leftIcon={<Plus className="w-4 h-4" />}>
          New quote
        </Button>
      </div>

      <FilterChips
        className="mb-4"
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        ariaLabel="Quote pipeline filter"
      />

      {loading ? (
        <SkeletonList count={3} />
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filter === 'all' ? 'No quotes yet' : `No ${statusLabel(filter).toLowerCase()} quotes`}
          description={filter === 'all' ? 'Draft your first quote — they show up here grouped by pipeline stage.' : undefined}
          action={filter === 'all' && <Button onClick={() => navigate('/quotes/new')} leftIcon={<Plus className="w-4 h-4" />}>New quote</Button>}
        />
      ) : (
        <div className="space-y-3">
          {quotes.map(q => {
            const client = clientById.get(q.client_id)
            return (
              <Card key={q.id} onClick={() => navigate(`/quotes/${q.id}`)}>
                <div className="flex items-start gap-3">
                  <DivisionDot slug={q.division_slug} className="mt-2" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {q.subject || q.quote_number}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {client?.name ?? '—'} · <span className="font-mono">{q.quote_number}</span>
                        </p>
                      </div>
                      <Badge variant={statusVariant(q.status)} className="shrink-0">{statusLabel(q.status)}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100">{formatGBP(q.total)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(q.created_at)}
                      </span>
                      {q.expires_at && (
                        <span>expires {formatDate(q.expires_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}
