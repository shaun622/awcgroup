import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { Suspense } from 'react'
import {
  Building, Layers, Users, Package, FileText, Bell, LogOut, ChevronRight, ArrowLeft,
  Settings as SettingsIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import ThemeToggle from '../components/layout/ThemeToggle'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useBusiness } from '../contexts/BusinessContext'
import { cn } from '../lib/utils'

/**
 * Settings — sidebar + pane shell, mirroring Tree Mate's pattern.
 *
 * Routes (configured in App.jsx, nested under <Route path="/settings">):
 *   /settings              → BusinessSettings (the index pane)
 *   /settings/divisions    → DivisionsSettings
 *   /settings/staff        → Staff
 *   /settings/products     → ProductsLibrary
 *
 * Sub-pages render INSIDE the right-pane card here — they must NOT wrap
 * their own content in PageWrapper or render an "← Settings" back link.
 */

const SIDEBAR = [
  { to: '/settings',             label: 'Organisation',         Icon: Building, end: true },
  { to: '/settings/divisions',   label: 'Divisions',            Icon: Layers },
  { to: '/settings/staff',       label: 'Team & roles',         Icon: Users },
  { to: '/settings/products',    label: 'Products & equipment', Icon: Package },
]

// Mobile row-link card colors (icon-box tint per row)
const MOBILE_ROW_COLORS = {
  Organisation: 'brand', Divisions: 'amber',
  'Team & roles': 'blue', 'Products & equipment': 'emerald',
}
const COLOR_CLASSES = {
  brand:   'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
  blue:    'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
}

export default function Settings() {
  const { signOut, user } = useAuth()
  const { business } = useBusiness()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  // Active section for the page title
  const activeItem = [...SIDEBAR].reverse().find(s =>
    s.end ? location.pathname === s.to : location.pathname.startsWith(s.to)
  ) || SIDEBAR[0]

  const onSettingsRoot = location.pathname === '/settings'

  return (
    <PageWrapper size="full" className="!bg-slate-50 dark:!bg-gray-950">
      {/* Mobile-only top bar — back link to /settings on sub-routes */}
      {!onSettingsRoot && (
        <div className="md:hidden mb-3">
          <Link
            to="/settings"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 -ml-1 min-h-tap px-1"
          >
            <ArrowLeft className="w-4 h-4" /> Settings
          </Link>
        </div>
      )}

      <div className="py-2">
        {/* Desktop hero */}
        <div className="hidden md:block mb-5">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
            <SettingsIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            Settings
          </p>
          <h1 className="mt-1 text-2xl md:text-[26px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {activeItem.label}
          </h1>
        </div>

        {/* Mobile hero */}
        <div className="md:hidden mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {onSettingsRoot ? 'Settings' : activeItem.label}
          </h1>
          {onSettingsRoot && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Signed in as <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span>
            </p>
          )}
        </div>

        {/* MOBILE: on a sub-route, just render the Outlet (the sub-page);
            on /settings root, show the row-card list */}
        {!onSettingsRoot && (
          <div className="md:hidden">
            <Suspense fallback={<div className="text-sm text-gray-500 dark:text-gray-400 italic">Loading…</div>}>
              <Outlet />
            </Suspense>
          </div>
        )}

        {/* MOBILE: row-card list (only on /settings root) */}
        <div className={cn('md:hidden space-y-4', !onSettingsRoot && 'hidden')}>
          {business && (
            <Card className="!p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-brand-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {business.name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base truncate">{business.name}</h2>
                {business.email && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{business.email}</p>}
              </div>
            </Card>
          )}

          <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {SIDEBAR.map(s => {
              const { Icon } = s
              const colorKey = MOBILE_ROW_COLORS[s.label] || 'brand'
              return (
                <NavLink
                  key={s.to}
                  to={s.to}
                  end={s.end}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors text-left group"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', COLOR_CLASSES[colorKey])}>
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-[13.5px]">{s.label}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={2} />
                </NavLink>
              )
            })}
          </Card>

          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 px-1">Appearance</h3>
            <Card className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-[13.5px]">Theme</p>
                <p className="text-[11.5px] text-gray-500 dark:text-gray-400">Choose light, dark, or match your system</p>
              </div>
              <ThemeToggle />
            </Card>
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="w-full sm:w-auto"
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign out
            </Button>
          </div>
        </div>

        {/* DESKTOP: sidebar + pane */}
        <div className="hidden md:grid md:grid-cols-12 gap-4">
          <aside className="md:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card p-2 self-start">
            <nav className="space-y-0.5">
              {SIDEBAR.map(s => {
                const { Icon } = s
                return (
                  <NavLink
                    key={s.to}
                    to={s.to}
                    end={s.end}
                    className={({ isActive }) => cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-[13px] transition-colors',
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    <span className="truncate">{s.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </aside>

          <div className="md:col-span-9 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card p-6 space-y-6">
            <Suspense fallback={<div className="text-sm text-gray-500 dark:text-gray-400 italic">Loading…</div>}>
              <Outlet />
            </Suspense>

            {/* Theme + Sign out — pinned to the bottom of every pane */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Theme</p>
                  <p className="text-[11.5px] text-gray-500 dark:text-gray-400">Choose light, dark, or match your system</p>
                </div>
                <ThemeToggle />
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
                Sign out
              </button>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">AWC Group · Signed in as {user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
