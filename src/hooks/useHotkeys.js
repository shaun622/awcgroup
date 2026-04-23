import { useEffect } from 'react'

/**
 * useHotkeys — register a keyboard shortcut.
 * @param {string} combo  e.g. 'mod+k', 'g j', 'shift+/'
 * @param {Function} handler
 * @param {Array} deps
 */
export function useHotkeys(combo, handler, deps = []) {
  useEffect(() => {
    const matcher = parseCombo(combo)
    let seqBuffer = []
    let seqTimer = null

    function isInInput(el) {
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
    }

    function onKey(e) {
      if (isInInput(e.target) && !matcher.allowInInput) return
      if (matcher.sequence) {
        const key = e.key.toLowerCase()
        seqBuffer.push(key)
        clearTimeout(seqTimer)
        seqTimer = setTimeout(() => { seqBuffer = [] }, 800)
        if (seqBuffer.join(' ') === matcher.sequence.join(' ')) {
          e.preventDefault()
          seqBuffer = []
          handler(e)
        }
        return
      }
      const mod = e.metaKey || e.ctrlKey
      if (matcher.mod && !mod) return
      if (!matcher.mod && mod) return
      if (matcher.shift && !e.shiftKey) return
      if (matcher.alt && !e.altKey) return
      if (e.key.toLowerCase() !== matcher.key) return
      e.preventDefault()
      handler(e)
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(seqTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function parseCombo(combo) {
  const c = combo.toLowerCase().trim()
  // sequence like "g j"
  if (c.includes(' ') && !c.includes('+')) {
    return { sequence: c.split(/\s+/) }
  }
  const parts = c.split('+').map(s => s.trim())
  const out = { mod: false, shift: false, alt: false, key: '' }
  parts.forEach(p => {
    if (p === 'mod' || p === 'cmd' || p === 'ctrl' || p === 'meta') out.mod = true
    else if (p === 'shift') out.shift = true
    else if (p === 'alt' || p === 'option') out.alt = true
    else out.key = p
  })
  return out
}
