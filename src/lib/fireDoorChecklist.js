/**
 * Canonical fire-door inspection checklist.
 *
 * Source: AWC Group fire door assessment template, mapped to BS 8214:2016
 * (Timber-based fire door assemblies) and the Regulatory Reform (Fire Safety)
 * Order 2005. 11 sections, 71 inspection items.
 *
 * Every UI surface that shows the checklist (assessment builder, summary,
 * PDF) reads from this single source. Keys ("1.1", "1.2", ...) are stable —
 * they are the keys used in `fire_door_assessments.responses` jsonb so they
 * MUST NOT be renumbered without a data migration.
 *
 * `conditional: true` on an item flags it as "where applicable" / "if fitted".
 * The assessor will typically mark these as N/A on doors where the feature
 * isn't present (e.g. signage 8.3 only applies to hold-open doors).
 */

export const FIRE_DOOR_CHECKLIST = [
  {
    section: 1,
    title: 'Door leaf',
    items: [
      { ref: '1.1',  label: 'Door leaf is present and correctly installed in the frame' },
      { ref: '1.2',  label: 'Door leaf bears a valid fire door label / plug / certification mark (e.g. BWF-Certifire, Warrington BM TRADA Q-Mark)' },
      { ref: '1.3',  label: 'Door rating is appropriate for the location (e.g. FD30, FD30S, FD60, FD60S)' },
      { ref: '1.4',  label: 'No holes, breaks, cracks or excessive damage to the door leaf' },
      { ref: '1.5',  label: 'Door leaf has not been modified, cut or altered in any way not covered by certification' },
      { ref: '1.6',  label: 'Any glazing panels are fire-rated and intact (no cracks or breaks)', conditional: true },
      { ref: '1.7',  label: 'Glazing is secured with appropriate fire-rated beads/fixings', conditional: true },
      { ref: '1.8',  label: 'Door leaf thickness is consistent and correct for rating' },
      { ref: '1.9',  label: 'Any letter plate / cat flap is fire-rated and certified', conditional: true },
      { ref: '1.10', label: 'Vision panels, louvres or air transfer grilles are fire-rated', conditional: true },
    ],
  },
  {
    section: 2,
    title: 'Door frame & surrounds',
    items: [
      { ref: '2.1', label: 'Door frame is structurally sound with no cracks, rot or damage' },
      { ref: '2.2', label: 'Frame is fire-rated and compatible with the door leaf certification' },
      { ref: '2.3', label: 'Frame is securely fixed to the wall with no gaps around the perimeter' },
      { ref: '2.4', label: 'Any gaps between frame and wall construction are fire-stopped with appropriate intumescent material' },
      { ref: '2.5', label: 'Architraves (if fitted) do not compromise the fire performance of the frame', conditional: true },
      { ref: '2.6', label: 'Threshold is in good condition and provides an effective seal', conditional: true },
    ],
  },
  {
    section: 3,
    title: 'Intumescent seals & cold smoke seals',
    items: [
      { ref: '3.1', label: 'Intumescent strips are present on all required edges (typically 3 sides: top and both vertical stiles)' },
      { ref: '3.2', label: 'Intumescent strips are continuous with no gaps or breaks' },
      { ref: '3.3', label: 'Strips are the correct specification for the door rating (e.g. 10mm × 4mm for FD30)' },
      { ref: '3.4', label: 'Seals are undamaged, not painted over, and fully adhered' },
      { ref: '3.5', label: 'Cold smoke seals (brush or blade) are present on FD30S / FD60S rated doors', conditional: true },
      { ref: '3.6', label: 'Cold smoke seals are continuous, undamaged and correctly fitted', conditional: true },
      { ref: '3.7', label: 'Threshold seal / automatic drop seal is present and functioning correctly', conditional: true },
    ],
  },
  {
    section: 4,
    title: 'Door gaps & clearances',
    items: [
      { ref: '4.1', label: 'Gap between door leaf and frame at head and stiles: max 4mm (recommend 2–4mm)' },
      { ref: '4.2', label: 'Gap between door leaf bottom and floor: max 10mm (typically 3–8mm depending on seals)' },
      { ref: '4.3', label: 'Gap is consistent along all edges with no high spots or binding' },
      { ref: '4.4', label: 'Door fits squarely within the frame (no distortion/warping)' },
    ],
  },
  {
    section: 5,
    title: 'Hinges',
    items: [
      { ref: '5.1', label: 'Minimum of 3 hinges fitted (FD30), or as specified in certification' },
      { ref: '5.2', label: 'Hinges are CE marked / certified and appropriate grade for the door weight' },
      { ref: '5.3', label: 'All hinge screws are present, tight and not stripped' },
      { ref: '5.4', label: 'Hinges show no signs of corrosion, damage or wear' },
      { ref: '5.5', label: 'Hinge pockets / recesses are correctly cut and hinges sit flush' },
      { ref: '5.6', label: 'Hinges are compatible with the door and frame certification' },
    ],
  },
  {
    section: 6,
    title: 'Door closers',
    items: [
      { ref: '6.1', label: 'Door closer is fitted (mandatory on all fire doors)' },
      { ref: '6.2', label: 'Closer is CE marked and tested to BS EN 1154 (or equivalent)' },
      { ref: '6.3', label: 'Door closes fully and positively from any open position (including from a 5° open position)' },
      { ref: '6.4', label: 'Door closes fully and latches without manual assistance' },
      { ref: '6.5', label: 'Closer speed is appropriately adjusted (not too fast/dangerous, not too slow)' },
      { ref: '6.6', label: 'Closer arm and body are undamaged with no fluid leaks' },
      { ref: '6.7', label: 'Hold-open devices (if fitted) are linked to fire alarm and release on activation', conditional: true },
      { ref: '6.8', label: 'No wedges, door stops or other means used to prop the door open' },
    ],
  },
  {
    section: 7,
    title: 'Locks, latches & hardware',
    items: [
      { ref: '7.1',  label: 'Latch / lock is CE marked and fire-rated (tested to BS EN 12209 or equivalent)' },
      { ref: '7.2',  label: 'Latch engages positively and holds the door closed' },
      { ref: '7.3',  label: 'Lock / latch is correctly aligned with the striking plate' },
      { ref: '7.4',  label: 'Striking plate is securely fixed with no movement' },
      { ref: '7.5',  label: 'Handles / lever furniture are fire-rated and securely fitted' },
      { ref: '7.6',  label: 'Emergency exit hardware (panic bar / push pad) is present where required and operational', conditional: true },
      { ref: '7.7',  label: 'Door can be easily opened from both sides (or escape side only, where specified)' },
      { ref: '7.8',  label: 'Access control / keypad devices are fire-rated and do not compromise certification', conditional: true },
      { ref: '7.9',  label: 'All hardware fixings (bolts, screws) are present and tight' },
      { ref: '7.10', label: 'Overhead bolts / flush bolts (double doors) are operable and aligned', conditional: true },
    ],
  },
  {
    section: 8,
    title: 'Signage',
    items: [
      { ref: '8.1', label: '"Fire Door – Keep Shut" sign is displayed on both faces', conditional: true },
      { ref: '8.2', label: '"Fire Door – Keep Locked" sign displayed', conditional: true },
      { ref: '8.3', label: '"Automatic Fire Door – Keep Clear" sign displayed (hold-open doors)', conditional: true },
      { ref: '8.4', label: 'Signs are legible, undamaged and comply with BS 5499 / ISO 7010' },
      { ref: '8.5', label: 'FD30 / FD60 rating sticker or certification label visible (if required by policy)', conditional: true },
    ],
  },
  {
    section: 9,
    title: 'Glazing',
    conditional: true,
    items: [
      { ref: '9.1', label: 'Glazing is fire-rated glass (certified to BS EN 1364 / BS EN 1634)' },
      { ref: '9.2', label: 'Glazing is marked / etched with certification details' },
      { ref: '9.3', label: 'Glazing is intact — no cracks, chips or breaks' },
      { ref: '9.4', label: 'Glazing is retained by fire-rated beads — timber, intumescent or metal' },
      { ref: '9.5', label: 'Maximum glazed area is within the limits of the door certification' },
    ],
  },
  {
    section: 10,
    title: 'Fire stopping & penetrations',
    items: [
      { ref: '10.1', label: 'No unauthorised holes or penetrations through the door leaf or frame' },
      { ref: '10.2', label: 'Any cable / pipe penetrations through the door surround are fire-stopped', conditional: true },
      { ref: '10.3', label: 'Cavity barriers around the frame are intact (where accessible)' },
      { ref: '10.4', label: 'Fanlight / over-panel (if present) is fire-rated and seals are intact', conditional: true },
    ],
  },
  {
    section: 11,
    title: 'General condition & operation',
    items: [
      { ref: '11.1', label: 'Door leaf and frame are free from excessive paint build-up over seals' },
      { ref: '11.2', label: 'Door leaf surface is free from significant damage, graffiti or defacement' },
      { ref: '11.3', label: 'Door operates smoothly without excessive resistance or binding' },
      { ref: '11.4', label: 'Door does not drag on the floor or frame' },
      { ref: '11.5', label: 'No evidence of tampering, forced entry or deliberate damage' },
      { ref: '11.6', label: 'Door and frame are suitably clean and maintained' },
    ],
  },
]

/** Available door fire ratings — drives the rating Select dropdown. */
export const FIRE_DOOR_RATINGS = [
  { value: 'FD30',   label: 'FD30 — 30 min' },
  { value: 'FD30S',  label: 'FD30S — 30 min + smoke' },
  { value: 'FD60',   label: 'FD60 — 60 min' },
  { value: 'FD60S',  label: 'FD60S — 60 min + smoke' },
  { value: 'FD90',   label: 'FD90 — 90 min' },
  { value: 'FD120',  label: 'FD120 — 120 min' },
  { value: 'custom', label: 'Custom…' },
]

/** Re-inspection cadence options — reuse of recurring_profiles frequency enum. */
export const REINSPECTION_FREQUENCIES = [
  { value: 'monthly',    label: 'Monthly' },
  { value: 'quarterly',  label: 'Every 3 months' },
  { value: 'biannual',   label: 'Every 6 months' },
  { value: 'annual',     label: 'Annually' },
]

/** Total inspection items across all sections (currently 71). */
export const TOTAL_ITEMS = FIRE_DOOR_CHECKLIST.reduce((acc, s) => acc + s.items.length, 0)

/** All items as a flat list with `section` and `sectionTitle` annotated. */
export function flattenChecklist() {
  return FIRE_DOOR_CHECKLIST.flatMap(sec =>
    sec.items.map(it => ({
      ...it,
      section: sec.section,
      sectionTitle: sec.title,
    }))
  )
}

/** Roll up a `responses` object into pass/fail/na counts and an outcome. */
export function rollUpResponses(responses = {}) {
  let pass = 0, fail = 0, na = 0
  for (const item of flattenChecklist()) {
    const r = responses[item.ref]?.result
    if (r === 'pass') pass++
    else if (r === 'fail') fail++
    else if (r === 'na') na++
  }
  const answered = pass + fail + na
  let outcome = null
  if (answered === TOTAL_ITEMS) {
    outcome = fail > 0 ? 'fail' : 'pass'
  } else if (answered > 0) {
    outcome = 'needs_investigation'
  }
  return { pass, fail, na, answered, outcome, total: TOTAL_ITEMS }
}

/**
 * Suggest a ref for a new door given the existing list. Looks at the most
 * recent door's ref and tries to extract a trailing number to increment.
 * Falls back to "Door {N+1}" where N is the existing door count.
 */
export function suggestDoorRef(existingDoors = []) {
  if (existingDoors.length === 0) return 'Door 1'

  const lastRef = existingDoors[0]?.ref ?? ''
  const m = lastRef.match(/^(.*?)(\d+)(\D*)$/)
  if (m) {
    const [, prefix, num, suffix] = m
    return `${prefix}${Number(num) + 1}${suffix}`
  }
  return `Door ${existingDoors.length + 1}`
}
