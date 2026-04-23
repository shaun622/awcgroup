import { useDivision } from '../../contexts/DivisionContext'
import { getDivision } from '../../lib/divisionRegistry'
import { Building2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

/**
 * DivisionSwitcher — segmented control showing all enabled divisions + Group view.
 * Tapping a chip swaps the active division (theme + data filters change instantly).
 * Mobile: horizontal scroll strip. Desktop: flex row.
 */

// Per-slug active-state colour (overrides brand-* so active colour always matches the division chosen,
// not the currently-active theme — prevents a "flash of wrong colour" during transition).
const SLUG_STYLES = {
  pest:      { active: 'bg-pest-500 text-white',      ring: 'ring-pest-500/30' },
  fire:      { active: 'bg-fire-500 text-white',      ring: 'ring-fire-500/30' },
  hygiene:   { active: 'bg-hygiene-500 text-white',   ring: 'ring-hygiene-500/30' },
  locksmith: { active: 'bg-locksmith-500 text-white', ring: 'ring-locksmith-500/30' },
  awc:       { active: 'bg-awc-900 text-white',       ring: 'ring-awc-700/30' },
}

export default function DivisionSwitcher({ includeGroup = true, className }) {
  const { active, setActive, available } = useDivision()

  const options = includeGroup
    ? [...available, getDivision('awc')]
    : available

  const onSwitch = (slug) => {
    if (slug === active) return
    const div = getDivision(slug)
    setActive(slug)
    toast.success(`Switched to ${div.name}`, {
      description: div.tagline,
      duration: 1800,
    })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/80 dark:bg-gray-800/60',
        'overflow-x-auto scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-1',
        className
      )}
      role="tablist"
      aria-label="Division selector"
      style={{ scrollbarWidth: 'none' }}
    >
      {options.map(div => {
        const isActive = active === div.slug
        const Icon = div.icon ?? Building2
        const style = SLUG_STYLES[div.slug]
        return (
          <button
            key={div.slug}
            role="tab"
            aria-selected={isActive}
            aria-label={div.name}
            onClick={() => onSwitch(div.slug)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all min-h-[36px]',
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
  )
}
