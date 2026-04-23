import { Users } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function Clients() {
  return (
    <PageWrapper size="xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Clients</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Shared across all AWC divisions</p>

      <EmptyState
        icon={Users}
        title="No clients yet"
        description="Add your first client to start tracking premises, quotes and jobs across any division."
        action={<Button>Add your first client</Button>}
      />
    </PageWrapper>
  )
}
