import { cn } from '../../lib/utils'

export default function PageWrapper({ children, className, size = 'lg' }) {
  const sizeCls = {
    lg:  'max-w-lg',
    xl:  'max-w-2xl',
    xxl: 'max-w-4xl',
    full: 'max-w-6xl',
  }[size] ?? 'max-w-lg'

  return (
    <main className={cn(sizeCls, 'mx-auto px-4 pt-4 pb-28 md:pb-12 animate-fade-in', className)}>
      {children}
    </main>
  )
}
