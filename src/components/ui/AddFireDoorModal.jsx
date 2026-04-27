import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Flame } from 'lucide-react'
import Modal from './Modal'
import Input, { Select, TextArea } from './Input'
import Button from './Button'
import { FIRE_DOOR_RATINGS, REINSPECTION_FREQUENCIES, suggestDoorRef } from '../../lib/fireDoorChecklist'

const emptyForm = (suggestedRef = '') => ({
  ref: suggestedRef,
  location: '',
  floor: '',
  rating: 'FD30S',
  rating_custom: '',
  notes: '',
  override_reinspection: false,
  reinspection_frequency: 'annual',
  next_due_at: '',
})

function fromRecord(d) {
  if (!d) return null
  return {
    ref: d.ref ?? '',
    location: d.location ?? '',
    floor: d.floor ?? '',
    rating: d.rating ?? 'FD30S',
    rating_custom: d.rating_custom ?? '',
    notes: d.notes ?? '',
    override_reinspection: !!d.reinspection_frequency,
    reinspection_frequency: d.reinspection_frequency ?? 'annual',
    next_due_at: d.next_due_at ? d.next_due_at.slice(0, 10) : '',
  }
}

/**
 * AddFireDoorModal — dual-mode (create + edit) form for a fire door register entry.
 *
 * @param open / onClose      Standard modal props
 * @param premises            The parent premises (for context + premises_id)
 * @param existingDoors       Array of doors already at this premises — used to
 *                            auto-suggest the next ref (e.g. "Door 1" → "Door 2")
 * @param addFireDoor         Mutation from useFireDoors (create mode)
 * @param updateFireDoor      Mutation from useFireDoors (edit mode)
 * @param editing             If supplied, modal opens in edit mode pre-filled
 * @param onCreated           Called with the saved row after a successful mutation
 * @param zLayer              Optional override for nested-modal stacking
 */
export default function AddFireDoorModal({
  open,
  onClose,
  premises,
  existingDoors = [],
  addFireDoor,
  updateFireDoor,
  editing,
  onCreated,
  zLayer,
}) {
  const isEdit = !!editing
  const suggestion = suggestDoorRef(existingDoors)
  const [form, setForm] = useState(() => fromRecord(editing) ?? emptyForm(suggestion))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(fromRecord(editing) ?? emptyForm(suggestDoorRef(existingDoors)))
    setErrors({})
    // Re-suggest when opening — only when not editing
    // and existingDoors changes
  }, [open, editing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const reset = () => {
    setForm(fromRecord(editing) ?? emptyForm(suggestDoorRef(existingDoors)))
    setErrors({}); setSaving(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.ref.trim()) errs.ref = 'Required'
    if (form.rating === 'custom' && !form.rating_custom.trim()) errs.rating_custom = 'Describe the rating'
    if (form.override_reinspection && !form.reinspection_frequency) errs.reinspection_frequency = 'Pick a frequency'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const payload = {
        premises_id: premises?.id,
        ref: form.ref,
        location: form.location,
        floor: form.floor,
        rating: form.rating,
        rating_custom: form.rating_custom,
        notes: form.notes,
        reinspection_frequency: form.override_reinspection ? form.reinspection_frequency : null,
        next_due_at: form.override_reinspection && form.next_due_at
          ? new Date(form.next_due_at).toISOString()
          : null,
      }
      const saved = isEdit
        ? await updateFireDoor(editing.id, payload)
        : await addFireDoor(payload)
      toast.success(isEdit ? 'Door updated' : 'Door added', { description: saved.ref })
      reset()
      onClose?.()
      onCreated?.(saved)
    } catch (err) {
      const msg = String(err.message || '')
      if (msg.includes('fire_doors_premises_id_ref_key') || msg.includes('duplicate')) {
        setErrors({ ref: 'A door with this reference already exists at this premises' })
      } else {
        toast.error(isEdit ? 'Could not update door' : 'Could not add door', { description: msg })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose?.() }}
      title={isEdit ? 'Edit fire door' : 'Add fire door'}
      description={premises ? `At ${premises.name || premises.address_line_1}` : null}
      size="md"
      zLayer={zLayer}
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Ref + floor row */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            wrapperClassName="col-span-2"
            label="Door reference"
            required
            autoFocus
            value={form.ref}
            onChange={e => update('ref', e.target.value)}
            error={errors.ref}
            placeholder="e.g. Door 1, FD-L2-S2, Flat 12 entrance"
            hint={!isEdit && existingDoors.length > 0 ? `Suggested from last door: ${suggestion}` : undefined}
          />
          <Input
            label="Floor"
            value={form.floor}
            onChange={e => update('floor', e.target.value)}
            placeholder="L2"
          />
        </div>

        <Input
          label="Location (optional)"
          value={form.location}
          onChange={e => update('location', e.target.value)}
          placeholder="e.g. Communal corridor 2nd floor, riser cupboard, plant room"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Fire rating"
            value={form.rating}
            onChange={e => update('rating', e.target.value)}
          >
            {FIRE_DOOR_RATINGS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          {form.rating === 'custom' && (
            <Input
              label="Custom rating"
              required
              value={form.rating_custom}
              onChange={e => update('rating_custom', e.target.value)}
              error={errors.rating_custom}
              placeholder="Describe…"
            />
          )}
        </div>

        <TextArea
          label="Notes (optional)"
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          rows={2}
          placeholder="Any specifics worth recording with the door — manufacturer, install date, recurring issues, etc."
        />

        {/* Per-door re-inspection override */}
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.override_reinspection}
              onChange={e => update('override_reinspection', e.target.checked)}
              className="mt-1 w-4 h-4 rounded accent-brand-500"
            />
            <div>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                Custom re-inspection schedule
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Override the building-wide re-inspection cadence for this specific door.
              </p>
            </div>
          </label>

          {form.override_reinspection && (
            <div className="ml-7 grid grid-cols-2 gap-3 animate-slide-down">
              <Select
                label="Frequency"
                value={form.reinspection_frequency}
                onChange={e => update('reinspection_frequency', e.target.value)}
                error={errors.reinspection_frequency}
              >
                {REINSPECTION_FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </Select>
              <Input
                label="Next due"
                type="date"
                value={form.next_due_at}
                onChange={e => update('next_due_at', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose?.() }} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={saving} leftIcon={<Flame className="w-4 h-4" />} className="flex-1">
            {isEdit ? 'Save changes' : 'Add door'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
