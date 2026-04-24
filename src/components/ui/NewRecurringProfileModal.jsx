import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from './Modal'
import Input, { Select, TextArea } from './Input'
import Button from './Button'
import { useDivision } from '../../contexts/DivisionContext'
import { useClients } from '../../hooks/useClients'
import { usePremises } from '../../hooks/usePremises'
import { useStaff } from '../../hooks/useStaff'
import { SERVICE_FREQUENCIES, cn, statusLabel } from '../../lib/utils'

const DURATION_TYPES = [
  { value: 'ongoing',    label: 'Ongoing (no end date)' },
  { value: 'until_date', label: 'Until a specific date' },
  { value: 'num_visits', label: 'After N visits' },
]

/**
 * NewRecurringProfileModal — creates an active recurring_profile.
 * Props:
 *   open, onClose          required
 *   client                 optional: pre-fills and locks the client picker
 *   premises               optional: pre-fills and locks the premises picker
 *   createProfile(payload) required mutation
 *   onCreated(profile)     optional
 *   zLayer
 */
export default function NewRecurringProfileModal({
  open, onClose,
  client: lockedClient,
  premises: lockedPremises,
  createProfile, onCreated, zLayer,
}) {
  const { currentDivision, available } = useDivision()
  const defaultDivision = lockedPremises?.division_slug ?? currentDivision?.slug ?? available[0]?.slug ?? 'pest'

  const [divisionSlug, setDivisionSlug] = useState(defaultDivision)
  const [clientId, setClientId] = useState(lockedClient?.id ?? '')
  const [premisesId, setPremisesId] = useState(lockedPremises?.id ?? '')
  const [form, setForm] = useState({
    title: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().slice(0, 10),
    duration_type: 'ongoing',
    end_date: '',
    total_visits: '',
    price: '',
    duration_minutes: '',
    staff_id: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDivisionSlug(lockedPremises?.division_slug ?? currentDivision?.slug ?? available[0]?.slug ?? 'pest')
    setClientId(lockedClient?.id ?? '')
    setPremisesId(lockedPremises?.id ?? '')
    setForm(f => ({
      ...f,
      title: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().slice(0, 10),
      duration_type: 'ongoing',
      end_date: '',
      total_visits: '',
      price: '',
      duration_minutes: '',
      staff_id: '',
      notes: '',
    }))
    setErrors({})
  }, [open, lockedClient?.id, lockedPremises?.id, currentDivision?.slug, available])

  const { allClients } = useClients()
  const { premises: clientPremises } = usePremises({
    clientId: clientId || undefined,
    divisionSlug,
  })
  const { staff } = useStaff({ divisionSlug })

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!clientId) errs.clientId = 'Pick a client'
    if (!form.title.trim()) errs.title = 'Required'
    if (!form.frequency) errs.frequency = 'Pick a frequency'
    if (!form.start_date) errs.start_date = 'Required'
    if (form.duration_type === 'until_date' && !form.end_date) errs.end_date = 'Pick an end date'
    if (form.duration_type === 'num_visits' && !form.total_visits) errs.total_visits = 'How many visits?'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const saved = await createProfile({
        division_slug: divisionSlug,
        client_id: clientId,
        premises_id: premisesId || null,
        title: form.title,
        notes: form.notes,
        frequency: form.frequency,
        start_date: form.start_date,
        duration_type: form.duration_type,
        end_date: form.duration_type === 'until_date' ? form.end_date : null,
        total_visits: form.duration_type === 'num_visits' ? Number(form.total_visits) : null,
        price: form.price ? Number(form.price) : null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        assigned_staff_id: form.staff_id || null,
      })
      toast.success('Recurring profile created', { description: `${statusLabel(form.frequency)} — ${form.title}` })
      onClose?.()
      onCreated?.(saved)
    } catch (err) {
      toast.error('Could not create profile', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Set up recurring service" description="Schedules a repeating visit for the premises. Pick the cadence and we'll surface it on the Schedule." size="md" zLayer={zLayer}>
      <form onSubmit={submit} className="space-y-4">
        {!lockedPremises && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Division</label>
            <div className="flex flex-wrap gap-2">
              {available.map(div => {
                const isActive = divisionSlug === div.slug
                return (
                  <button
                    key={div.slug}
                    type="button"
                    onClick={() => setDivisionSlug(div.slug)}
                    className={cn(
                      'rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all min-h-[44px] flex items-center gap-1.5',
                      isActive ? '' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 text-gray-600 dark:text-gray-400',
                    )}
                    style={isActive ? { borderColor: div.brand_hex, backgroundColor: `${div.brand_hex}15`, color: div.brand_hex } : {}}
                  >
                    <div.icon className="w-4 h-4" strokeWidth={2.2} />
                    {div.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!lockedClient && (
          <Select label="Client" required value={clientId} onChange={e => { setClientId(e.target.value); setPremisesId('') }} error={errors.clientId}>
            <option value="">— Pick a client —</option>
            {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        {!lockedPremises && clientId && (
          <Select label="Premises (optional)" value={premisesId} onChange={e => setPremisesId(e.target.value)}>
            <option value="">— No specific premises —</option>
            {clientPremises.map(p => <option key={p.id} value={p.id}>{p.name ? `${p.name} · ${p.address_line_1}` : p.address_line_1}</option>)}
          </Select>
        )}

        <Input label="Title" required value={form.title} onChange={e => update('title', e.target.value)} error={errors.title} placeholder="e.g. Monthly pest visit" />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Frequency" value={form.frequency} onChange={e => update('frequency', e.target.value)} error={errors.frequency}>
            {SERVICE_FREQUENCIES.map(f => <option key={f} value={f}>{statusLabel(f)}</option>)}
          </Select>
          <Input label="First visit" type="date" required value={form.start_date} onChange={e => update('start_date', e.target.value)} error={errors.start_date} />
        </div>

        <Select label="Duration" value={form.duration_type} onChange={e => update('duration_type', e.target.value)}>
          {DURATION_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </Select>

        {form.duration_type === 'until_date' && (
          <Input label="End date" type="date" required value={form.end_date} onChange={e => update('end_date', e.target.value)} error={errors.end_date} />
        )}
        {form.duration_type === 'num_visits' && (
          <Input label="Total visits" type="number" min="1" required value={form.total_visits} onChange={e => update('total_visits', e.target.value)} error={errors.total_visits} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Price per visit" type="number" min="0" step="0.01" leftAdornment="£" value={form.price} onChange={e => update('price', e.target.value)} />
          <Input label="Duration (min)" type="number" min="0" step="15" value={form.duration_minutes} onChange={e => update('duration_minutes', e.target.value)} />
        </div>

        <Select label="Assign to (optional)" value={form.staff_id} onChange={e => update('staff_id', e.target.value)}>
          <option value="">— Unassigned —</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.role === 'owner' ? ' (you)' : ''}</option>)}
        </Select>

        <TextArea label="Notes (optional)" rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1">Create profile</Button>
        </div>
      </form>
    </Modal>
  )
}
