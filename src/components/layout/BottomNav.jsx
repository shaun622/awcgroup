import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, CalendarDays, Users, Briefcase, MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useHaptic } from '../../hooks/useHaptic'
import MoreSheet from './MoreSheet'

const SECONDARY_ROUTES = ['/quotes', '/invoices', '/analytics', '/settings']

const TABS = [
  { path: '/',          label: 'Home',     icon: Home },
  { path: '/schedule',  label: 'Schedule', icon: CalendarDays },
  { path: '/clients',   label: 'Clients',  icon: Users },
  { path: '/jobs',      label: 'Jobs',     icon: Briefcase },
  { path: '__more__',   label: 'More',     icon: MoreHorizontal },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const haptic = useHaptic()
  const [moreOpen, setMoreOpen] = useState(false)

  const isSecondary = SECONDARY_ROUTES.some(r => location.pathname.startsWith(r))

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-gray-200/60 dark:border-gray-800/60 z-40 shadow-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Primary"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {TABS.map(tab => {
            const isMore = tab.path === '__more__'
            const active = isMore
              ? (isSecondary || moreOpen)
              : tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path)
            const Icon = tab.icon
            return (
              <button
                key={tab.path}
                onClick={() => {
                  haptic.tap()
                  if (isMore) { setMoreOpen(true); return }
                  navigate(tab.path + location.search)
                  window.scrollTo(0, 0)
                }}
                className={cn(
                  'flex flex-col items-center justify-center min-h-tap min-w-tap py-2 px-3 transition-all duration-200 relative',
                  active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                )}
                aria-current={active ? 'page' : undefined}
                aria-haspopup={isMore ? 'dialog' : undefined}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-brand-500 rounded-full" aria-hidden />
                )}
                <Icon
                  className="w-5 h-5"
                  strokeWidth={active ? 2.5 : 2}
                  fill={active && !isMore ? 'currentColor' : 'none'}
                  fillOpacity={active && !isMore ? 0.12 : 0}
                />
                <span className={cn('mt-0.5 text-[10px] font-medium', active && 'font-semibold')}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
