/**
 * useHaptic — tiny wrapper for navigator.vibrate.
 * Returns a function you can call anywhere; degrades silently on unsupported browsers.
 *
 * Usage:
 *   const haptic = useHaptic()
 *   haptic.tap()      // subtle tap (10ms)
 *   haptic.success()  // two-beat confirm
 *   haptic.warn()     // longer buzz
 */
export function useHaptic() {
  const vibrate = (pattern) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern) } catch {}
    }
  }
  return {
    tap: () => vibrate(8),
    select: () => vibrate(12),
    success: () => vibrate([10, 40, 20]),
    warn: () => vibrate([30, 30, 30]),
    error: () => vibrate([50, 50, 100]),
  }
}
