import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, FileText, BarChart3, Settings, X, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useHaptic } from '../../hooks/useHaptic'

const ITEMS = [
  { to: '/quotes',    label: 'Quotes',    icon: Receipt,   description: 'Drafts, sent, and accepted' },
  { to: '/invoices',  label: 'Invoices',  icon: FileText,  description: 'Billing and payments' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, description: 'Revenue, jobs by tech' },
  { to: '/settings',  label: 'Settings',  icon: Settings,  description: 'Business, divisions, staff, products' },
]

/**
 * MoreSheet — bottom-sheet overflow for the mobile nav. Surfaces the
 * secondary pages that don't fit in the 5-tab bar (Quotes, Invoices,
 * Analytics, Settings). Opened from the last BottomNav slot.
 */
export default function MoreSheet({ open, onClose }) {
  const navigate = useNavigate()
  const haptic = useHaptic()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const go = (to) => {
    haptic.tap()
    navigate(to)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-40 md:hidden animate-fade-in" role="dialog" aria-modal="true" aria-label="More menu">
      <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="absolute left-0 right-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-elevated animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-2" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">More</h2>
          <button
            onClick={onClose}
            className="min-h-tap min-w-tap flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 -mr-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {ITEMS.map(item => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <button
                  onClick={() => go(item.to)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left min-h-tap active:bg-gray-50 dark:active:bg-gray-800/60"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              </li>
            )
          })}
        </ul>
        <div className="h-2" />
      </div>
    </div>
  )
}
