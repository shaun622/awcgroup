import { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Modal — bottom sheet on mobile, centred card on desktop.
 * Supports drag-to-dismiss on mobile. Scroll-locks <html> position-fixed style (iOS-safe).
 */
export default function Modal({ open, onClose, title, description, headerAction, children, size = 'md', className }) {
  const scrollYRef = useRef(0)
  const panelRef = useRef(null)
  const [dragY, setDragY] = useState(0)
  const touchStartY = useRef(null)

  useEffect(() => {
    if (!open) return
    scrollYRef.current = window.scrollY
    document.documentElement.style.position = 'fixed'
    document.documentElement.style.top = `-${scrollYRef.current}px`
    document.documentElement.style.width = '100%'
    document.documentElement.style.overflow = 'hidden'

    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)

    return () => {
      document.documentElement.style.position = ''
      document.documentElement.style.top = ''
      document.documentElement.style.width = ''
      document.documentElement.style.overflow = ''
      window.scrollTo(0, scrollYRef.current)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const onTouchStart = useCallback((e) => {
    if (window.innerWidth >= 640) return
    touchStartY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e) => {
    if (window.innerWidth >= 640 || touchStartY.current === null) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0) setDragY(diff)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (window.innerWidth >= 640) return
    if (dragY > 120) onClose?.()
    setDragY(0)
    touchStartY.current = null
  }, [dragY, onClose])

  if (!open) return null

  const sizeClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }[size] ?? 'sm:max-w-lg'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className={cn(
          'relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-h-[92vh] flex flex-col shadow-elevated animate-slide-up',
          sizeClass,
          className
        )}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? 'none' : 'transform 0.25s ease-out' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Mobile drag handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full sm:hidden" aria-hidden />

        {(title || headerAction) && (
          <div className="flex items-start justify-between px-6 pt-6 pb-2">
            <div className="flex-1 min-w-0">
              {title && <h2 id="modal-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>}
              {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
            <div className="flex items-center gap-1 ml-2">
              {headerAction}
              <button
                onClick={onClose}
                className="min-h-tap min-w-tap flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors -mr-2"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto overflow-x-hidden overscroll-contain px-6 pb-6 pt-2">
          {children}
        </div>
      </div>
    </div>
  )
}
