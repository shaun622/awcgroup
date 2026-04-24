import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Modal from './Modal'
import Input, { Select, TextArea } from './Input'
import Button from './Button'
import { CLIENT_TYPES, formatPostcode, formatUKPhone, statusLabel, validateUKPostcode } from '../../lib/utils'

const emptyForm = {
  name: '',
  client_type: 'residential',
  email: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  postcode: '',
  notes: '',
  pipeline_stage: 'lead',
}

function fromRecord(c) {
  if (!c) return emptyForm
  return {
    name: c.name ?? '',
    client_type: c.client_type ?? 'residential',
    email: c.email ?? '',
    phone: c.phone ?? '',
    address_line_1: c.address_line_1 ?? '',
    address_line_2: c.address_line_2 ?? '',
    city: c.city ?? '',
    postcode: c.postcode ?? '',
    notes: c.notes ?? '',
    pipeline_stage: c.pipeline_stage ?? 'lead',
  }
}

/**
 * Client form modal. Dual-mode:
 *   • Create — pass `addClient` mutation
 *   • Edit   — pass `editing` (existing client) + `updateClient` mutation
 *
 * Other props:
 *   open, onClose              required
 *   onCreated(saved)           optional; default behaviour on create is to
 *                              navigate to /clients/:id
 *   zLayer                     pass 60+ when nested in another modal
 */
export default function AddClientModal({
  open, onClose,
  addClient, updateClient,
  editing,
  onCreated, zLayer,
}) {
  const navigate = useNavigate()
  const isEdit = !!editing
  const [form, setForm] = useState(() => fromRecord(editing))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Hydrate when modal opens or when the editing record changes
  useEffect(() => {
    if (open) setForm(fromRecord(editing))
    if (open) setErrors({})
  }, [open, editing?.id])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const reset = () => { setForm(fromRecord(editing)); setErrors({}); setSaving(false) }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (form.postcode && !validateUKPostcode(form.postcode)) errs.postcode = 'Invalid UK postcode'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const payload = {
        ...form,
        postcode: form.postcode ? formatPostcode(form.postcode) : null,
      }
      const saved = isEdit
        ? await updateClient(editing.id, payload)
        : await addClient(payload)
      toast.success(isEdit ? `${saved.name} updated` : `${saved.name} added`)
      reset()
      onClose?.()
      if (!isEdit) {
        if (onCreated) onCreated(saved)
        else navigate(`/clients/${saved.id}`)
      } else {
        onCreated?.(saved)
      }
    } catch (err) {
      toast.error(isEdit ? 'Could not update client' : 'Could not add client', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose?.() }}
      title={isEdit ? 'Edit client' : 'Add client'}
      description={isEdit ? 'Update contact details or pipeline stage.' : 'You can add premises and jobs on the next screen.'}
      size="md"
      zLayer={zLayer}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Full name or business name" required autoFocus value={form.name} onChange={e => update('name', e.target.value)} error={errors.name} placeholder="e.g. Riverside Café Ltd" />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Client type" value={form.client_type} onChange={e => update('client_type', e.target.value)}>
            {CLIENT_TYPES.map(t => <option key={t} value={t}>{statusLabel(t)}</option>)}
          </Select>
          <Select label="Pipeline stage" value={form.pipeline_stage} onChange={e => update('pipeline_stage', e.target.value)}>
            {['lead', 'quoted', 'active', 'on_hold', 'lost'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="hello@example.co.uk" />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} onBlur={e => update('phone', formatUKPhone(e.target.value))} placeholder="07123 456789" />
        </div>

        <Input label="Address line 1" value={form.address_line_1} onChange={e => update('address_line_1', e.target.value)} placeholder="45 High Street" />
        <Input label="Address line 2 (optional)" value={form.address_line_2} onChange={e => update('address_line_2', e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
          <Input label="Postcode" value={form.postcode} onChange={e => update('postcode', e.target.value)} onBlur={e => update('postcode', formatPostcode(e.target.value))} error={errors.postcode} placeholder="SW1A 1AA" />
        </div>

        <TextArea label="Notes (optional)" value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Preferred contact, access details, etc." />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose?.() }} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1">{isEdit ? 'Save changes' : 'Add client'}</Button>
        </div>
      </form>
    </Modal>
  )
}
