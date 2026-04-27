import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { logActivity } from '../lib/activity'
import { rollUpResponses } from '../lib/fireDoorChecklist'

/**
 * useFireDoorAssessment — load + autosave one assessment row.
 *
 * The assessment lives as a single jsonb `responses` map plus the outcome /
 * urgency / signatures fields. Autosave is debounced at the call-site;
 * this hook just exposes idempotent `saveDraft` and `complete` mutations.
 *
 * @param {object} opts
 * @param {string} [opts.assessmentId]  Existing assessment id (resume) — null for new
 * @param {string} [opts.fireDoorId]    Required when creating
 */
export function useFireDoorAssessment({ assessmentId, fireDoorId } = {}) {
  const { business } = useBusiness()
  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(!!assessmentId)
  const [error, setError] = useState(null)

  // Load if we have an id
  useEffect(() => {
    if (!business || !assessmentId) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('fire_door_assessments').select('*')
        .eq('id', assessmentId).eq('business_id', business.id).maybeSingle()
      if (!alive) return
      if (error) setError(error)
      else setAssessment(data ?? null)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [business, assessmentId])

  /**
   * saveDraft — upsert behaviour.
   * - If we don't have an assessment row yet, INSERT one with status='in_progress'.
   * - If we do, UPDATE in place. Always keeps status='in_progress'.
   *
   * Returns the saved row.
   */
  const saveDraft = useCallback(async (patch = {}) => {
    if (!business) throw new Error('No business loaded')

    if (!assessment) {
      if (!fireDoorId) throw new Error('fireDoorId required to start an assessment')
      const row = {
        business_id: business.id,
        fire_door_id: fireDoorId,
        status: 'in_progress',
        responses: patch.responses ?? {},
        ...stripUndefined(patch),
      }
      const { data, error } = await supabase.from('fire_door_assessments').insert(row).select().single()
      if (error) throw error
      setAssessment(data)
      return data
    }

    const clean = stripUndefined(patch)
    if (Object.keys(clean).length === 0) return assessment
    const { data, error } = await supabase
      .from('fire_door_assessments')
      .update(clean)
      .eq('id', assessment.id)
      .select()
      .single()
    if (error) throw error
    setAssessment(data)
    return data
  }, [business, assessment, fireDoorId])

  /**
   * complete — flip status='completed', set completed_at, recompute roll-ups,
   * write activity, and bump the door's next_due_at if a re-inspection
   * cadence is configured.
   *
   * Caller must supply the final state (responses / signatures / outcome /
   * urgency / etc) — this just persists + finalises.
   */
  const complete = useCallback(async (finalPatch) => {
    if (!business) throw new Error('No business loaded')
    let current = assessment
    if (!current) {
      // Edge case: completing without ever saving. Insert first.
      current = await saveDraft({})
    }

    const responses = finalPatch.responses ?? current.responses ?? {}
    const roll = rollUpResponses(responses)
    const outcome = finalPatch.outcome ?? roll.outcome ?? null

    const update = {
      ...stripUndefined(finalPatch),
      responses,
      pass_count: roll.pass,
      fail_count: roll.fail,
      na_count: roll.na,
      outcome,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('fire_door_assessments')
      .update(update)
      .eq('id', current.id)
      .select()
      .single()
    if (error) throw error
    setAssessment(data)

    // Activity feed (fire-and-forget)
    logActivity({
      business_id: business.id,
      division_slug: 'fire',
      event_type: 'fire_door_assessed',
      title: `Fire door ${outcome === 'pass' ? 'passed' : outcome === 'fail' ? 'failed' : 'assessed'}: ${data.door_ref_snapshot ?? ''}`.trim(),
      subtitle: `${roll.pass} pass · ${roll.fail} fail · ${roll.na} N/A`,
      entity_type: 'fire_door_assessment',
      entity_id: data.id,
    })

    // Bump door's next_due_at if cadence is configured
    bumpNextDue(data.fire_door_id).catch(() => {})

    return data
  }, [business, assessment, saveDraft])

  return { assessment, loading, error, saveDraft, complete, setAssessment }
}

/**
 * useCurrentStaffAndQualification — find the staff_members row for the
 * logged-in auth user. Used by the "Use my details" tick on the assessor
 * signature section. Returns null when the auth user has no staff row
 * (e.g. they're an owner without a tech profile).
 */
export function useCurrentStaff() {
  const { business } = useBusiness()
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business) { setStaff(null); setLoading(false); return }
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!alive) return
      if (!user) { setStaff(null); setLoading(false); return }
      const { data } = await supabase
        .from('staff_members')
        .select('*')
        .eq('business_id', business.id)
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (!alive) return
      setStaff(data ?? null)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [business])

  /**
   * Persist a qualification value back to the staff_members row.
   * No-op if there's no staff row (e.g. owner without one).
   */
  const persistQualification = useCallback(async (qualification) => {
    if (!staff) return
    if ((staff.qualification ?? '') === (qualification ?? '')) return
    const { data } = await supabase
      .from('staff_members')
      .update({ qualification: qualification?.trim() || null })
      .eq('id', staff.id)
      .select()
      .single()
    if (data) setStaff(data)
  }, [staff])

  return { staff, loading, persistQualification }
}

/* helpers */

function stripUndefined(obj) {
  const out = {}
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

const FREQUENCY_DAYS = {
  weekly: 7,
  fortnightly: 14,
  monthly: 30,
  quarterly: 91,
  biannual: 182,
  annual: 365,
}

/**
 * After a completed assessment, push the door's next_due_at forward.
 * Priority for cadence:
 *   1. Door-level override (fire_doors.reinspection_frequency)
 *   2. Premises-level recurring_profile (profile_type='fire_door_inspection',
 *      fire_door_id=NULL) for the premises that owns this door
 * If neither exists, leave next_due_at untouched.
 */
async function bumpNextDue(fireDoorId) {
  const { data: door } = await supabase
    .from('fire_doors').select('id, premises_id, reinspection_frequency')
    .eq('id', fireDoorId).maybeSingle()
  if (!door) return

  let frequency = door.reinspection_frequency
  if (!frequency) {
    const { data: profile } = await supabase
      .from('recurring_profiles').select('frequency')
      .eq('premises_id', door.premises_id)
      .eq('profile_type', 'fire_door_inspection')
      .is('fire_door_id', null)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    frequency = profile?.frequency
  }
  if (!frequency) return
  const days = FREQUENCY_DAYS[frequency] ?? 365
  const next = new Date(Date.now() + days * 86400_000).toISOString()
  await supabase.from('fire_doors').update({ next_due_at: next }).eq('id', fireDoorId)
}
