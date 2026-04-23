import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Card = forwardRef(function Card(
  { children, className, onClick, elevated, as: Tag = 'div', ...props },
  ref
) {
  const base = onClick ? 'card-interactive' : elevated ? 'card-elevated' : 'card'
  return (
    <Tag
      ref={ref}
      className={cn(base, className)}
      onClick={onClick}
      {...(onClick && { role: 'button', tabIndex: 0, onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) }
      } })}
      {...props}
    >
      {children}
    </Tag>
  )
})

export default Card
