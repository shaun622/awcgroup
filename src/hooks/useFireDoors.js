import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { logActivity } from '../lib/activity'

/**
 * useFireDoors — load + mutate fire-door register entries for a premises.
 *
 * Fire doors are long-lived register entries belonging to a premises. The
 * door's metadata (ref, location, rating) carries forward across
 * assessments. Pass/fail responses live in `fire_door_assessments`.
 *
 * @param {object} opts
 * @param {string} [opts.premisesId] - filter to one premises (most common use)
 * @param {boolean} [opts.activeOnly=true] - hide soft-archived doors
 */
export function useFireDoors({ premisesId, activeOnly = true } = {}) {
  const { business } = useBusiness()
  const [fireDoors, setFireDoors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  const refetch = useCallback(async () => {
    if (!business) { setFireDoors([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('fire_doors').select('*').eq('business_id', business.id)
    if (premisesId) q = q.eq('premises_id', premisesId)
    if (activeOnly) q = q.eq('active', true)
    const { data, error } = await q.order('ref', { ascending: true })
    if (error) setError(error)
    else setFireDoors(data ?? [])
    setLoading(false)
  }, [business, premisesId, activeOnly])

  useEffect(() => { refetch() }, [refetch])

  // Realtime — merge inserts/updates/deletes
  useEffect(() => {
    if (!business) return
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ch = supabase
      .channel(`fire-doors-${business.id}-${suffix}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'fire_doors', filter: `business_id=eq.${business.id}` },
        (payload) => {
          const match = (row) =>
            (!premisesId || row.premises_id === premisesId) &&
            (!activeOnly || row.active)
          setFireDoors(prev => {
            if (payload.eventType === 'INSERT') {
              if (!match(payload.new)) return prev
              if (prev.some(d => d.id === payload.new.id)) return prev
              return [...prev, payload.new].sort(byRef)
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(d => d.id === payload.new.id ? payload.new : d).filter(match).sort(byRef)
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(d => d.id !== payload.old.id)
            }
            return prev
          })
        })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [business, premisesId, activeOnly])

  const addFireDoor = useCallback(async (payload) => {
    if (!business) throw new Error('No business loaded')
    if (!payload.premises_id) throw new Error('premises_id required')
    if (!payload.ref?.trim()) throw new Error('ref required')

    const row = {
      business_id: business.id,
      premises_id: payload.premises_id,
      ref: payload.ref.trim(),
      location: payload.location?.trim() || null,
      floor: payload.floor?.trim() || null,
      rating: payload.rating || null,
      rating_custom: payload.rating === 'custom' ? (payload.rating_custom?.trim() || null) : null,
      notes: payload.notes?.trim() || null,
      reinspection_frequency: payload.reinspection_frequency || null,
      next_due_at: payload.next_due_at || null,
    }
    const { data, error } = await supabase
      .from('fire_doors')
      .insert(row)
      .select()
      .single()
    if (error) throw error

    setFireDoors(prev => (prev.some(d => d.id === data.id) ? prev : [...prev, data].sort(byRef)))

    logActivity({
      business_id: business.id,
      division_slug: 'fire',
      event_type: 'fire_door_added',
      title: `Fire door added: ${data.ref}`,
      subtitle: data.location || null,
      entity_type: 'fire_door',
      entity_id: data.id,
    })

    return data
  }, [business])

  const updateFireDoor = useCallback(async (id, patch) => {
    const clean = { ...patch }
    if (clean.rating !== 'custom') clean.rating_custom = null
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k])
    const { data, error } = await supabase
      .from('fire_doors')
      .update(clean)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setFireDoors(prev => prev.map(d => d.id === id ? data : d).sort(byRef))
    return data
  }, [])

  const deleteFireDoor = useCallback(async (id) => {
    // Hard delete for now — assessments cascade. If we need an audit trail
    // later, switch to soft-archive (active=false).
    const { error } = await supabase.from('fire_doors').delete().eq('id', id)
    if (error) throw error
    setFireDoors(prev => prev.filter(d => d.id !== id))
  }, [])

  return { fireDoors, loading, error, refetch, addFireDoor, updateFireDoor, deleteFireDoor }
}

/**
 * useFireDoor — load a single fire door + its premises + assessment history.
 */
export function useFireDoor(id) {
  const { business } = useBusiness()
  const [door, setDoor] = useState(null)
  const [premises, setPremises] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!business || !id) return
    setLoading(true)
    const { data: d } = await supabase
      .from('fire_doors')
      .select('*')
      .eq('id', id)
      .eq('business_id', business.id)
      .maybeSingle()
    setDoor(d ?? null)
    if (d) {
      const [premRes, assRes] = await Promise.all([
        supabase.from('premises').select('*').eq('id', d.premises_id).maybeSingle(),
        supabase.from('fire_door_assessments').select('*').eq('fire_door_id', id).order('assessed_at', { ascending: false }),
      ])
      setPremises(premRes.data ?? null)
      setAssessments(assRes.data ?? [])
    } else {
      setPremises(null); setAssessments([])
    }
    setLoading(false)
  }, [business, id])

  useEffect(() => { refetch() }, [refetch])

  return { door, premises, assessments, loading, refetch, setDoor }
}

function byRef(a, b) {
  return (a.ref ?? '').localeCompare(b.ref ?? '', undefined, { numeric: true, sensitivity: 'base' })
}
