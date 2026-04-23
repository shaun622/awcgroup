import { Briefcase } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { useDivision } from '../contexts/DivisionContext'

export default function Jobs() {
  const { currentDivision, isGroupView } = useDivision()
  const scope = isGroupView ? 'all divisions' : currentDivision?.name

  return (
    <PageWrapper size="xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Jobs</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Scope: {scope}</p>

      <EmptyState
        icon={Briefcase}
        title="No jobs yet"
        description="Jobs appear here once created from a quote, the schedule, or a client's profile."
        action={<Button>Create a job</Button>}
      />
    </PageWrapper>
  )
}
