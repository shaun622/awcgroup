import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Plus, Calendar, AlertCircle } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { DivisionDot } from '../components/ui/DivisionChip'
import { useInvoices } from '../hooks/useInvoices'
import { useClients } from '../hooks/useClients'
import { useDivision } from '../contexts/DivisionContext'
import { cn, formatDate, formatGBP, statusLabel, statusVariant } from '../lib/utils'

const FILTERS = ['all', 'draft', 'sent', 'overdue', 'paid', 'void']

export default function Invoices() {
  const navigate = useNavigate()
  const { currentDivision, isGroupView } = useDivision()
  const divisionSlug = isGroupView ? undefined : currentDivision?.slug
  const [filter, setFilter] = useState('all')
  const [baseFilter, overdueMode] = filter === 'overdue' ? [undefined, true] : [filter === 'all' ? undefined : filter, false]
  const { invoices, loading } = useInvoices({ divisionSlug, status: baseFilter })

  const { allClients } = useClients()
  const clientById = useMemo(() => {
    const m = new Map(); allClients.forEach(c => m.set(c.id, c)); return m
  }, [allClients])

  const nowIso = new Date().toISOString().slice(0, 10)
  const filtered = useMemo(() => {
    if (!overdueMode) return invoices
    return invoices.filter(i => i.status === 'sent' && i.due_date && i.due_date < nowIso)
  }, [invoices, overdueMode, nowIso])

  return (
    <PageWrapper size="xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{isGroupView ? 'All divisions' : currentDivision?.name}</p>
        </div>
        <Button onClick={() => navigate('/invoices/new')} leftIcon={<Plus className="w-4 h-4" />}>
          New invoice
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
        {FILTERS.map(s => {
          const active = filter === s
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px]',
                active
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              {s === 'all' ? 'All' : statusLabel(s)}
            </button>
          )
        })}
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filter === 'overdue' ? 'No overdue invoices' : filter === 'all' ? 'No invoices yet' : `No ${statusLabel(filter).toLowerCase()} invoices`}
          description={filter === 'all' ? 'Create your first invoice — from a completed job, an accepted quote, or a blank slate.' : undefined}
          action={filter === 'all' && <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/invoices/new')}>New invoice</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => {
            const client = clientById.get(inv.client_id)
            const overdue = inv.status === 'sent' && inv.due_date && inv.due_date < nowIso
            return (
              <Card key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
                <div className="flex items-start gap-3">
                  {inv.division_slug
                    ? <DivisionDot slug={inv.division_slug} className="mt-2" />
                    : <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate font-mono">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{client?.name ?? '—'}</p>
                      </div>
                      <Badge variant={overdue ? 'danger' : statusVariant(inv.status)} className="shrink-0">
                        {overdue ? 'Overdue' : statusLabel(inv.status)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100">{formatGBP(inv.total)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Issued {formatDate(inv.issue_date)}
                      </span>
                      <span>Due {formatDate(inv.due_date)}</span>
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
