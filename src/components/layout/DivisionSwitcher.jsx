import { useEffect, useRef } from 'react'
import { useDivision } from '../../contexts/DivisionContext'
import { getDivision } from '../../lib/divisionRegistry'
import { Building2 } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * DivisionSwitcher — segmented control showing all enabled divisions + Group view.
 * Tapping a chip swaps the active division (theme + data filters change instantly).
 *
 * Responsive behaviour:
 * - Mobile: horizontal-scroll pill strip, shows `name_short`, auto-scrolls active
 *   chip into view, fades out the right edge to signal overflow.
 * - Desktop (sm+): flexes to natural width with full `name`.
 */

// Each division brings its own palette for the ACTIVE state so the chip colour
// reflects the division being selected, not whichever theme is live.
const SLUG_STYLES = {
  pest:      { active: 'bg-pest-500 text-white',      ring: 'ring-pest-500/30' },
  fire:      { active: 'bg-fire-500 text-white',      ring: 'ring-fire-500/30' },
  hygiene:   { active: 'bg-hygiene-500 text-white',   ring: 'ring-hygiene-500/30' },
  locksmith: { active: 'bg-locksmith-500 text-white', ring: 'ring-locksmith-500/30' },
  awc:       { active: 'bg-awc-900 text-white',       ring: 'ring-awc-700/30' },
}

export default function DivisionSwitcher({ includeGroup = true, className }) {
  const { active, setActive, available } = useDivision()
  const stripRef = useRef(null)
  const activeChipRef = useRef(null)

  const options = includeGroup
    ? [...available, getDivision('awc')]
    : available

  // Keep the active chip visible when the division changes or on mount
  useEffect(() => {
    const chip = activeChipRef.current
    if (!chip) return
    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])

  const onSwitch = (slug) => {
    if (slug === active) return
    setActive(slug)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Right-edge fade — hints at scrollable content on mobile. Pointer-events-none so it doesn't block taps. */}
      <div
        aria-hidden
        className="md:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 dark:from-gray-950 to-transparent z-10"
      />
      <div
        ref={stripRef}
        className={cn(
          'flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/80 dark:bg-gray-800/60 overflow-x-auto scrollbar-none',
          'snap-x snap-mandatory md:snap-none'
        )}
        role="tablist"
        aria-label="Division selector"
      >
        {options.map(div => {
          const isActive = active === div.slug
          const Icon = div.icon ?? Building2
          const style = SLUG_STYLES[div.slug]
          return (
            <button
              key={div.slug}
              ref={isActive ? activeChipRef : null}
              role="tab"
              aria-selected={isActive}
              aria-label={div.name}
              onClick={() => onSwitch(div.slug)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 snap-center transition-all min-h-[36px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                style?.ring,
                isActive
                  ? cn(style.active, 'shadow-sm')
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/60 dark:hover:bg-gray-900/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <span>{div.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
