import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

/**
 * FilterChips — horizontal scrollable pill filter.
 * Active chip auto-scrolls into the container's centre so on mobile
 * you can see the chips on either side of your selection.
 * Same UX pattern as the header DivisionSwitcher.
 *
 * @param {Array} options  [{ value, label, count? }]
 * @param value            current value
 * @param onChange         (value) => void
 */
export default function FilterChips({ options, value, onChange, className, ariaLabel = 'Filter' }) {
  const activeRef = useRef(null)

  useEffect(() => {
    const chip = activeRef.current
    if (!chip) return
    // scrollIntoView walks up to the nearest scroll container — our
    // overflow-x-auto wrapper — and centres the chip in it. `nearest`
    // on block keeps the page from scrolling vertically.
    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [value])

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1',
        'snap-x snap-mandatory md:snap-none',
        className
      )}
    >
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            ref={active ? activeRef : null}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px] snap-center flex items-center gap-1.5',
              active
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span className={cn(
                'inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] tabular-nums',
                active
                  ? 'bg-white/25 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400'
              )}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
