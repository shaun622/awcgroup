import { cn } from '../../lib/utils'

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center text-center py-16 px-6', className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center mb-4 text-brand-500 shadow-glow">
          <Icon className="w-8 h-8" strokeWidth={1.75} />
        </div>
      )}
      {title && <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>}
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  )
}
