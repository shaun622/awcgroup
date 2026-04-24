import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from './Modal'
import Input, { Select, TextArea } from './Input'
import Button from './Button'
import DivisionChip from './DivisionChip'
import { useDivision } from '../../contexts/DivisionContext'
import { DIVISIONS, DIVISION_SLUGS } from '../../lib/divisionRegistry'
import { formatPostcode, SERVICE_FREQUENCIES, statusLabel, validateUKPostcode } from '../../lib/utils'
import { cn } from '../../lib/utils'

const SITE_TYPES = ['residential', 'commercial', 'industrial', 'public_sector', 'rural', 'roadside']

const emptyForm = (division_slug) => ({
  division_slug,
  name: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  postcode: '',
  site_type: 'commercial',
  access_notes: '',
  regular_service: false,
  service_frequency: 'monthly',
  next_due_at: '',
})

function fromRecord(p) {
  if (!p) return null
  return {
    division_slug: p.division_slug,
    name: p.name ?? '',
    address_line_1: p.address_line_1 ?? '',
    address_line_2: p.address_line_2 ?? '',
    city: p.city ?? '',
    postcode: p.postcode ?? '',
    site_type: p.site_type ?? 'commercial',
    access_notes: p.access_notes ?? '',
    regular_service: !!p.regular_service,
    service_frequency: p.service_frequency ?? 'monthly',
    next_due_at: p.next_due_at ? p.next_due_at.slice(0, 10) : '',
  }
}

export default function AddPremisesModal({
  open,
  onClose,
  client,
  addPremises,
  updatePremises,
  editing,
  onCreated,
  zLayer,
}) {
  const isEdit = !!editing
  const { currentDivision, available } = useDivision()
  // Default to active division if not Group view, else first available
  const defaultDivision = currentDivision?.slug ?? available[0]?.slug ?? 'pest'
  const [form, setForm] = useState(() => fromRecord(editing) ?? emptyForm(defaultDivision))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // When the modal opens, hydrate with the editing record or reset
  useEffect(() => {
    if (!open) return
    setForm(fromRecord(editing) ?? emptyForm(defaultDivision))
    setErrors({})
  }, [open, editing?.id, defaultDivision])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const reset = () => {
    setForm(fromRecord(editing) ?? emptyForm(defaultDivision))
    setErrors({}); setSaving(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.address_line_1.trim()) errs.address_line_1 = 'Required'
    if (form.postcode && !validateUKPostcode(form.postcode)) errs.postcode = 'Invalid UK postcode'
    if (form.regular_service && !form.service_frequency) errs.service_frequency = 'Pick a frequency'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const payload = {
        client_id: client?.id,
        division_slug: form.division_slug,
        name: form.name,
        address_line_1: form.address_line_1,
        address_line_2: form.address_line_2,
        city: form.city,
        postcode: form.postcode ? formatPostcode(form.postcode) : null,
        site_type: form.site_type,
        access_notes: form.access_notes,
        regular_service: form.regular_service,
        service_frequency: form.regular_service ? form.service_frequency : null,
        next_due_at: form.regular_service && form.next_due_at
          ? new Date(form.next_due_at).toISOString()
          : null,
      }
      const saved = isEdit
        ? await updatePremises(editing.id, payload)
        : await addPremises(payload)
      toast.success(isEdit ? 'Premises updated' : 'Premises added', { description: saved.address_line_1 })
      reset()
      onClose?.()
      onCreated?.(saved)
    } catch (err) {
      toast.error(isEdit ? 'Could not update premises' : 'Could not add premises', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose?.() }} title={isEdit ? 'Edit premises' : 'Add premises'} description={`For ${client?.name ?? 'client'}`} size="md" zLayer={zLayer}>
      <form onSubmit={submit} className="space-y-4">
        {/* Division selector */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Division</label>
          <div className="flex flex-wrap gap-2">
            {available.map(div => {
              const isActive = form.division_slug === div.slug
              return (
                <button
                  key={div.slug}
                  type="button"
                  onClick={() => update('division_slug', div.slug)}
                  className={cn(
                    'relative rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all min-h-[44px] flex items-center gap-1.5',
                    isActive ? '' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400',
                  )}
                  style={isActive ? {
                    borderColor: div.brand_hex,
                    backgroundColor: `${div.brand_hex}15`,
                    color: div.brand_hex,
                  } : {}}
                >
                  <div.icon className="w-4 h-4" strokeWidth={2.2} />
                  {div.name}
                </button>
              )
            })}
          </div>
        </div>

        <Input
          label="Label (optional)"
          value={form.name}
          onChange={e => update('name', e.target.value)}
          placeholder="e.g. Main kitchen, Head office, Unit 4"
          hint="Short label to distinguish this site from others for the same client."
        />

        <Input
          label="Address line 1"
          required
          autoFocus
          value={form.address_line_1}
          onChange={e => update('address_line_1', e.target.value)}
          error={errors.address_line_1}
          placeholder="45 High Street"
        />
        <Input
          label="Address line 2 (optional)"
          value={form.address_line_2}
          onChange={e => update('address_line_2', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
          <Input
            label="Postcode"
            value={form.postcode}
            onChange={e => update('postcode', e.target.value)}
            onBlur={e => update('postcode', formatPostcode(e.target.value))}
            error={errors.postcode}
            placeholder="SW1A 1AA"
          />
        </div>

        <Select label="Site type" value={form.site_type} onChange={e => update('site_type', e.target.value)}>
          {SITE_TYPES.map(t => <option key={t} value={t}>{statusLabel(t)}</option>)}
        </Select>

        <TextArea
          label="Access notes (optional)"
          value={form.access_notes}
          onChange={e => update('access_notes', e.target.value)}
          rows={2}
          placeholder="e.g. Key under back pot, gate code 1234, dog on premises"
        />

        {/* Regular service toggle */}
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.regular_service}
              onChange={e => update('regular_service', e.target.checked)}
              className="mt-1 w-4 h-4 rounded accent-brand-500"
            />
            <div>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Ongoing maintenance contract</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Turn on for recurring scheduled visits.</p>
            </div>
          </label>

          {form.regular_service && (
            <div className="ml-7 grid grid-cols-2 gap-3 animate-slide-down">
              <Select
                label="Frequency"
                value={form.service_frequency}
                onChange={e => update('service_frequency', e.target.value)}
                error={errors.service_frequency}
              >
                {SERVICE_FREQUENCIES.map(f => <option key={f} value={f}>{statusLabel(f)}</option>)}
              </Select>
              <Input
                label="Next visit"
                type="date"
                value={form.next_due_at}
                onChange={e => update('next_due_at', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose?.() }} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1">{isEdit ? 'Save changes' : 'Add premises'}</Button>
        </div>
      </form>
    </Modal>
  )
}
