import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { cn } from '../../lib/utils'
import { useHaptic } from '../../hooks/useHaptic'

const MODES = [
  { value: 'light',  icon: Sun,     label: 'Light'  },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark',   icon: Moon,    label: 'Dark'   },
]

export default function ThemeToggle({ compact }) {
  const { mode, setMode } = useTheme()
  const haptic = useHaptic()

  if (compact) {
    const idx = MODES.findIndex(m => m.value === mode)
    const next = MODES[(idx + 1) % MODES.length]
    const Icon = next.icon
    return (
      <button
        onClick={() => { setMode(next.value); haptic.tap() }}
        className="min-h-tap min-w-tap rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={`Theme: ${mode}. Click to switch.`}
      >
        {(() => {
          const Current = MODES.find(m => m.value === mode).icon
          return <Current className="w-5 h-5" strokeWidth={2} />
        })()}
      </button>
    )
  }

  return (
    <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-0.5">
      {MODES.map(m => {
        const Icon = m.icon
        const active = mode === m.value
        return (
          <button
            key={m.value}
            onClick={() => { setMode(m.value); haptic.tap() }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-tap',
              active
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            )}
            aria-pressed={active}
            aria-label={`Theme: ${m.label}`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}
