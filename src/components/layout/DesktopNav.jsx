import { NavLink, useLocation } from 'react-router-dom'
import { Home, CalendarDays, Users, Briefcase, Receipt, FileText, BarChart3, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const TABS = [
  { path: '/',          label: 'Home',      icon: Home },
  { path: '/schedule',  label: 'Schedule',  icon: CalendarDays },
  { path: '/clients',   label: 'Clients',   icon: Users },
  { path: '/jobs',      label: 'Jobs',      icon: Briefcase },
  { path: '/quotes',    label: 'Quotes',    icon: Receipt },
  { path: '/invoices',  label: 'Invoices',  icon: FileText },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings',  label: 'Settings',  icon: Settings },
]

export default function DesktopNav() {
  const location = useLocation()

  return (
    <div className="hidden md:block sticky top-[60px] z-20 bg-slate-50/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/60 dark:border-gray-800/60">
      <nav className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Primary navigation">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path)
          return (
            <NavLink
              key={tab.path}
              to={tab.path + location.search}
              className={cn(
                'flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                active
                  ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
