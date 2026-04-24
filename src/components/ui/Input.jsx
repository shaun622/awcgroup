import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input(
  { label, error, hint, className, wrapperClassName, large, leftAdornment, rightAdornment, ...props },
  ref
) {
  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
      )}
      <div className={cn('relative', leftAdornment && 'isolate')}>
        {leftAdornment && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none z-10">
            {leftAdornment}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            large ? 'input-lg' : 'input',
            leftAdornment && 'pl-8',
            rightAdornment && 'pr-10',
            error && 'border-red-300 focus:ring-red-500/30 focus:border-red-400',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {rightAdornment && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightAdornment}
          </span>
        )}
      </div>
      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  )
})

export default Input

export const TextArea = forwardRef(function TextArea(
  { label, error, hint, className, rows = 3, ...props },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'input resize-none',
          error && 'border-red-300 focus:ring-red-500/30 focus:border-red-400',
          className
        )}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
})

export const Select = forwardRef(function Select(
  { label, error, hint, className, children, ...props },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn('input', error && 'border-red-300 focus:ring-red-500/30', className)}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
})
