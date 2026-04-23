import { cn } from '../../lib/utils'
import { getDivision } from '../../lib/divisionRegistry'

/**
 * DivisionChip — compact pill showing a division.
 * Uses the division's own palette (pest/fire/hygiene/locksmith/awc), independent of active theme.
 */

const STYLES = {
  pest: {
    solid: 'bg-pest-500 text-white',
    soft: 'bg-pest-50 text-pest-700 ring-pest-200/60 dark:bg-pest-950/40 dark:text-pest-300 dark:ring-pest-800/40',
    dot:  'bg-pest-500',
  },
  fire: {
    solid: 'bg-fire-500 text-white',
    soft: 'bg-fire-50 text-fire-700 ring-fire-200/60 dark:bg-fire-950/40 dark:text-fire-300 dark:ring-fire-800/40',
    dot:  'bg-fire-500',
  },
  hygiene: {
    solid: 'bg-hygiene-500 text-white',
    soft: 'bg-hygiene-50 text-hygiene-700 ring-hygiene-200/60 dark:bg-hygiene-950/40 dark:text-hygiene-300 dark:ring-hygiene-800/40',
    dot:  'bg-hygiene-500',
  },
  locksmith: {
    solid: 'bg-locksmith-500 text-white',
    soft: 'bg-locksmith-50 text-locksmith-700 ring-locksmith-200/60 dark:bg-locksmith-950/40 dark:text-locksmith-300 dark:ring-locksmith-800/40',
    dot:  'bg-locksmith-500',
  },
  awc: {
    solid: 'bg-awc-900 text-white',
    soft: 'bg-awc-50 text-awc-800 ring-awc-200/60 dark:bg-awc-900/40 dark:text-awc-200 dark:ring-awc-700/40',
    dot:  'bg-awc-700',
  },
}

export default function DivisionChip({ slug, variant = 'soft', showIcon = true, showLabel = true, className, size = 'md' }) {
  const div = getDivision(slug)
  if (!div) return null
  const style = STYLES[slug]
  const Icon = div.icon

  const sizeCls = size === 'sm'
    ? 'text-[10px] px-2 py-0.5 gap-1'
    : size === 'lg'
      ? 'text-sm px-3.5 py-2 gap-2'
      : 'text-xs px-3 py-1.5 gap-1.5'

  return (
    <span className={cn(
      'division-chip',
      variant === 'solid' ? style.solid : style.soft,
      variant === 'soft' && 'ring-1 ring-inset',
      sizeCls,
      className,
    )}>
      {showIcon && Icon && <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} strokeWidth={2.2} />}
      {showLabel && <span>{div.name}</span>}
    </span>
  )
}

export function DivisionDot({ slug, className }) {
  const style = STYLES[slug]
  if (!style) return null
  return <span className={cn('inline-block w-2 h-2 rounded-full', style.dot, className)} aria-hidden />
}
