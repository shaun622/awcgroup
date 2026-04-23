import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
  ghost:     'btn-ghost',
}

const sizes = {
  sm: 'px-3 py-2 text-xs min-h-[36px] min-w-[36px]',
  md: '', // default in .btn
  lg: 'px-6 py-4 text-base',
}

const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', className, loading, leftIcon, rightIcon, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(variants[variant], sizes[size], className)}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        leftIcon && <span className="-ml-0.5" aria-hidden>{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="-mr-0.5" aria-hidden>{rightIcon}</span>}
    </button>
  )
})

export default Button
