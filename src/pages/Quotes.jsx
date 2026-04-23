import { Receipt } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function Quotes() {
  return (
    <PageWrapper size="xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Quotes</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Draft, send, and track across divisions</p>

      <EmptyState
        icon={Receipt}
        title="No quotes yet"
        description="Quotes you create — division-tagged — will show up here grouped by pipeline stage."
        action={<Button>Create your first quote</Button>}
      />
    </PageWrapper>
  )
}
