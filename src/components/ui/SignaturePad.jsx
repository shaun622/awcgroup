import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * SignaturePad — canvas-based signature capture, mouse + touch + pen unified
 * via Pointer Events. No external deps.
 *
 * @param {object} props
 * @param {string}   [props.value]        Existing signature as a data URL — displayed read-only
 * @param {function} props.onChange       Called with a PNG data URL on stroke end
 * @param {function} [props.onClear]      Called when the user taps Clear (parent should null `value`)
 * @param {boolean}  [props.disabled]     Read-only mode: shows existing signature, no drawing
 * @param {number}   [props.height=140]   Canvas display height in CSS pixels
 * @param {string}   [props.label]        Above-canvas label (e.g. "Assessor signature")
 * @param {string}   [props.placeholder]  Faint hint text when empty
 */
export default function SignaturePad({
  value,
  onChange,
  onClear,
  disabled = false,
  height = 140,
  label,
  placeholder = 'Sign with finger, pen or mouse',
}) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const dprRef = useRef(1)
  const [isEmpty, setIsEmpty] = useState(!value)

  // Initial setup + redraw existing signature
  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr

    const resize = () => {
      const rect = wrapper.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2
      ctx.strokeStyle = '#111827'

      // If value provided, paint it onto the canvas
      if (value) {
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, height)
          ctx.drawImage(img, 0, 0, rect.width, height)
        }
        img.src = value
        setIsEmpty(false)
      } else {
        ctx.clearRect(0, 0, rect.width, height)
        setIsEmpty(true)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [value, height])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e) => {
    if (disabled) return
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPointRef.current = getPos(e)
    setIsEmpty(false)
  }

  const onPointerMove = (e) => {
    if (!drawingRef.current || disabled) return
    const ctx = canvasRef.current.getContext('2d')
    const p = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastPointRef.current = p
  }

  const onPointerUp = (e) => {
    if (!drawingRef.current || disabled) return
    drawingRef.current = false
    try { canvasRef.current.releasePointerCapture(e.pointerId) } catch {}
    onChange?.(canvasRef.current.toDataURL('image/png'))
  }

  const handleClear = () => {
    if (disabled) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onClear?.()
    onChange?.(null)
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>
          {!disabled && !isEmpty && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            >
              <Eraser className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}
      <div
        ref={wrapperRef}
        className={cn(
          'relative rounded-xl border bg-white dark:bg-gray-950 transition-colors',
          isEmpty
            ? 'border-dashed border-gray-300 dark:border-gray-700'
            : 'border-gray-200 dark:border-gray-800',
          disabled && 'opacity-70',
        )}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn('block w-full h-full touch-none', !disabled && 'cursor-crosshair')}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400 dark:text-gray-600">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}
