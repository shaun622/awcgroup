import { CalendarDays } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { useDivision } from '../contexts/DivisionContext'

export default function Schedule() {
  const { currentDivision, isGroupView } = useDivision()
  const label = isGroupView ? 'all divisions' : currentDivision?.name.toLowerCase()

  return (
    <PageWrapper size="xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Schedule</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Today, this week, upcoming — {label}</p>

      <EmptyState
        icon={CalendarDays}
        title="Nothing scheduled yet"
        description="Once you create jobs and recurring profiles, they'll appear here — deduplicated and ordered by time."
        action={<Button>Create a job</Button>}
      />
    </PageWrapper>
  )
}
