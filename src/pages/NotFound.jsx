import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <PageWrapper>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="Looks like that route doesn't exist. Head back to the dashboard."
        action={
          <Link to="/">
            <Button>Back to dashboard</Button>
          </Link>
        }
      />
    </PageWrapper>
  )
}
