import { Link } from 'react-router-dom'
import { Building, Layers, Users, Package, FileText, Bell, LogOut, ChevronRight } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import ThemeToggle from '../components/layout/ThemeToggle'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

const SECTIONS = [
  { to: '/settings/business',   label: 'Business details',       description: 'Company name, VAT, address, logo', icon: Building },
  { to: '/settings/divisions',  label: 'Divisions',              description: 'Enable and configure divisions',   icon: Layers },
  { to: '/settings/staff',      label: 'Staff',                  description: 'Team members and roles',           icon: Users },
  { to: '/settings/products',   label: 'Products & equipment',   description: 'Per-division library',             icon: Package },
  { to: '/settings/templates',  label: 'Templates & emails',     description: 'Quotes, invoices, communications', icon: FileText },
  { to: '/settings/automations',label: 'Automations',            description: 'Triggered emails and reminders',   icon: Bell },
]

export default function Settings() {
  const { signOut, user } = useAuth()

  return (
    <PageWrapper size="xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Signed in as <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span>
      </p>

      <div className="space-y-6">
        <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <Link
                key={s.to}
                to={s.to}
                className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{s.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            )
          })}
        </Card>

        <div className="space-y-2">
          <h2 className="section-title">Appearance</h2>
          <Card className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Theme</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose light, dark, or match your system</p>
            </div>
            <ThemeToggle />
          </Card>
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut()
              toast.success('Signed out')
            }}
            className="w-full sm:w-auto"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign out
          </Button>
        </div>
      </div>
    </PageWrapper>
  )
}
