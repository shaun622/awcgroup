import { BarChart3 } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import EmptyState from '../components/ui/EmptyState'

export default function Analytics() {
  return (
    <PageWrapper size="full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Analytics</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Revenue, job mix, tech utilisation</p>

      <EmptyState
        icon={BarChart3}
        title="Analytics will light up once you have data"
        description="As jobs complete and invoices settle, you'll see revenue by division, job-type breakdowns, tech utilisation, and more."
      />
    </PageWrapper>
  )
}
