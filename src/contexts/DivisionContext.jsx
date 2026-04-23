import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DIVISIONS, DIVISION_SLUGS, ALL_THEME_CLASSES, getDivision } from '../lib/divisionRegistry'
import { useBusiness } from './BusinessContext'

const DivisionContext = createContext(null)

const STORAGE_KEY = 'awc:division'
const VALID_SLUGS = [...DIVISION_SLUGS, 'awc']

function readInitial() {
  if (typeof window === 'undefined') return 'pest'
  // URL param wins on first load (deep-linkable)
  try {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('division')
    if (p && VALID_SLUGS.includes(p)) return p
  } catch {}
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s && VALID_SLUGS.includes(s)) return s
  } catch {}
  return 'pest'
}

function applyThemeClass(slug) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  ALL_THEME_CLASSES.forEach(c => root.classList.remove(c))
  root.classList.add(`theme-${slug}`)
  // Update meta theme-color to match brand
  const meta = document.querySelector('meta[name="theme-color"]')
  const div = getDivision(slug)
  if (meta && div) meta.setAttribute('content', div.brand_hex)
}

export function DivisionProvider({ children }) {
  const [active, setActiveState] = useState(readInitial)
  const [searchParams, setSearchParams] = useSearchParams()
  const { business } = useBusiness()

  // Which divisions this business has enabled. Falls back to all four for pre-auth / onboarding.
  const available = useMemo(() => {
    const enabled = business?.enabled_divisions?.length ? business.enabled_divisions : DIVISION_SLUGS
    return enabled.map(slug => getDivision(slug)).filter(Boolean)
  }, [business])

  // Keep theme class in sync with active division
  useEffect(() => { applyThemeClass(active) }, [active])

  const setActive = useCallback((slug) => {
    if (!VALID_SLUGS.includes(slug)) return
    setActiveState(slug)
    try { localStorage.setItem(STORAGE_KEY, slug) } catch {}
    // Sync URL param
    const next = new URLSearchParams(searchParams)
    if (slug === 'pest') next.delete('division')
    else next.set('division', slug)
    setSearchParams(next, { replace: true })
    // Haptic nudge on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(8) } catch {}
    }
  }, [searchParams, setSearchParams])

  // If URL changes externally (back/forward), sync
  useEffect(() => {
    const p = searchParams.get('division')
    if (p && VALID_SLUGS.includes(p) && p !== active) {
      setActiveState(p)
    }
  }, [searchParams, active])

  const currentDivision = active === 'awc' ? null : getDivision(active)
  const isGroupView = active === 'awc'

  const value = useMemo(() => ({
    active,
    setActive,
    available,
    bySlug: DIVISIONS,
    currentDivision,
    isGroupView,
  }), [active, setActive, available, currentDivision, isGroupView])

  return <DivisionContext.Provider value={value}>{children}</DivisionContext.Provider>
}

export function useDivision() {
  const ctx = useContext(DivisionContext)
  if (!ctx) throw new Error('useDivision must be used within <DivisionProvider>')
  return ctx
}
