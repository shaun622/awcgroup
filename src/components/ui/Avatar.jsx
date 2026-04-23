import { cn, initials } from '../../lib/utils'

// Deterministic colour from name — for consistent avatar tint per person
const TINTS = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-lime-100 text-lime-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
]

function tintFor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return TINTS[Math.abs(h) % TINTS.length]
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
}

export default function Avatar({ name, src, size = 'md', className }) {
  const sizeCls = sizes[size] ?? sizes.md
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={cn('rounded-xl object-cover bg-gray-100', sizeCls, className)}
      />
    )
  }
  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center font-semibold select-none',
        tintFor(name),
        sizeCls,
        className
      )}
      aria-label={name ?? 'avatar'}
    >
      {initials(name)}
    </div>
  )
}
