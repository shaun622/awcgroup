import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * StatCard — animated count-up number, label, optional trend indicator.
 * Respects prefers-reduced-motion.
 */
export default function StatCard({ label, value, icon: Icon, trend, trendLabel, format, className, onClick }) {
  const animated = useCountUp(Number(value) || 0)
  const display = format ? format(animated) : animated.toLocaleString('en-GB')

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColour = trend > 0
    ? 'text-emerald-600'
    : trend < 0
      ? 'text-red-600'
      : 'text-gray-400'

  return (
    <div
      className={cn('card', onClick && 'card-interactive', className)}
      onClick={onClick}
      {...(onClick && { role: 'button', tabIndex: 0 })}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {display}
          </p>
          {(trend != null && trendLabel) && (
            <div className="mt-1.5 flex items-center gap-1">
              <TrendIcon className={cn('w-3.5 h-3.5', trendColour)} strokeWidth={2.5} />
              <span className={cn('text-xs font-medium', trendColour)}>{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setValue(target); return }

    const start = performance.now()
    const from = 0
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)   // ease-out cubic
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}
