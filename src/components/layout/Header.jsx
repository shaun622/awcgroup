import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import DivisionSwitcher from './DivisionSwitcher'
import ThemeToggle from './ThemeToggle'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'

export default function Header({ title, backTo, right, onOpenCommand }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <header
      className="sticky top-0 z-30 glass border-b border-gray-200/60 dark:border-gray-800/60"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-3 min-h-[60px]">
        {/* Left — back button OR brand */}
        {backTo ? (
          <button
            onClick={() => navigate(backTo)}
            className="min-h-tap min-w-tap flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 -ml-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
            <div className="w-8 h-8 rounded-xl bg-awc-900 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-sm">
              AW
            </div>
            <span className="hidden sm:block font-semibold text-gray-900 dark:text-gray-100 tracking-tight">AWC Group</span>
          </Link>
        )}

        {/* Centre — division switcher */}
        <div className="flex-1 flex justify-center min-w-0">
          {title ? (
            <h1 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
          ) : (
            <DivisionSwitcher className="max-w-full" />
          )}
        </div>

        {/* Right — search, theme, avatar, custom */}
        <div className="flex items-center gap-1 shrink-0">
          {right}
          {onOpenCommand && (
            <button
              onClick={onOpenCommand}
              className="min-h-tap min-w-tap rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Search (Cmd+K)"
              title="Search (⌘K)"
            >
              <Search className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
          <div className="hidden sm:block">
            <ThemeToggle compact />
          </div>
          {user && (
            <Link to="/settings" className="ml-1" aria-label="Settings">
              <Avatar name={user.email ?? 'User'} size="sm" />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
