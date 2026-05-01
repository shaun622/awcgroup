import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Input, { Select, TextArea } from './Input'
import Button from './Button'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../contexts/BusinessContext'
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
  const { business } = useBusiness()
  const isEdit = !!editing
  const [form, setForm] = useState(() => fromRecord(editing))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  // Holds an existing client whose email or phone matches what's being
  // typed. We surface it as a warning so the operator picks the existing
  // record instead of accidentally creating a duplicate. Email and phone
  // are the unique keys — name alone is NOT a dup signal (two legitimate
  // "John Smith" residentials can coexist).
  const [duplicate, setDuplicate] = useState(null)

  // Hydrate when modal opens or when the editing record changes
  useEffect(() => {
    if (open) setForm(fromRecord(editing))
    if (open) setErrors({})
    if (!open) setDuplicate(null)
  }, [open, editing?.id])

  // Live duplicate check — keyed on email + phone, NOT name. Email match
  // is case-insensitive trimmed; phone match strips all non-digits so
  // "07123 456789" and "07123456789" collide. Skipped while editing an
  // existing record (we'd flag the row against itself).
  useEffect(() => {
    if (!open || isEdit || !business?.id) { setDuplicate(null); return }
    const email = (form.email || '').trim().toLowerCase()
    const phone = (form.phone || '').replace(/\D/g, '')
    if (!email && phone.length < 6) { setDuplicate(null); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const filters = []
      if (email) filters.push(`email.ilike.${email}`)
      if (phone.length >= 6) filters.push(`phone.ilike.%${phone.slice(-8)}%`)
      if (filters.length === 0) return
      const { data } = await supabase
        .from('clients')
        .select('id, name, email, phone, address_line_1, city, postcode')
        .eq('business_id', business.id)
        .or(filters.join(','))
        .limit(10)
      if (cancelled) return
      // Tighten match in JS — DB filter on phone uses a substring; could
      // match shorter dial-out prefixes. Compare strictly here.
      const match = (data || []).find(c => {
        if (email && (c.email || '').trim().toLowerCase() === email) return true
        if (phone.length >= 6) {
          const cp = (c.phone || '').replace(/\D/g, '')
          if (cp && (cp === phone || cp.endsWith(phone) || phone.endsWith(cp))) return true
        }
        return false
      })
      setDuplicate(match || null)
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, isEdit, business?.id, form.email, form.phone])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const reset = () => { setForm(fromRecord(editing)); setErrors({}); setSaving(false); setDuplicate(null) }

  function useExisting() {
    if (!duplicate) return
    onCreated?.(duplicate)
    onClose?.()
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (form.postcode && !validateUKPostcode(form.postcode)) errs.postcode = 'Invalid UK postcode'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      // Belt-and-braces dup check on submit — only when creating, by
      // email or phone. If we find one, surface it as the warning and
      // don't insert. The live useEffect already guards against this
      // but a 250ms debounce window means a fast operator could submit
      // before the live check catches a freshly-typed match.
      if (!isEdit && business?.id) {
        const trimmedEmail = (form.email || '').trim().toLowerCase()
        const trimmedPhone = (form.phone || '').replace(/\D/g, '')
        if (trimmedEmail || trimmedPhone.length >= 6) {
          const filters = []
          if (trimmedEmail) filters.push(`email.ilike.${trimmedEmail}`)
          if (trimmedPhone.length >= 6) filters.push(`phone.ilike.%${trimmedPhone.slice(-8)}%`)
          const { data: existing } = await supabase
            .from('clients')
            .select('id, name, email, phone, address_line_1, city, postcode')
            .eq('business_id', business.id)
            .or(filters.join(','))
            .limit(10)
          const match = (existing || []).find(c => {
            if (trimmedEmail && (c.email || '').trim().toLowerCase() === trimmedEmail) return true
            if (trimmedPhone.length >= 6) {
              const cp = (c.phone || '').replace(/\D/g, '')
              if (cp && (cp === trimmedPhone || cp.endsWith(trimmedPhone) || trimmedPhone.endsWith(cp))) return true
            }
            return false
          })
          if (match) {
            setDuplicate(match)
            setSaving(false)
            return
          }
        }
      }

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

        {/* Duplicate warning — fires while typing email or phone. Email
            and phone are the unique keys; two clients sharing either is
            the strong signal that they're the same person and someone
            fat-fingered a new record. The operator can pick the existing
            client or change contact info to something distinct. */}
        {duplicate && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={2.25} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  A client with this email or phone already exists: "{duplicate.name}"
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 truncate">
                  {[duplicate.email, duplicate.phone].filter(Boolean).join(' · ') || [duplicate.address_line_1, duplicate.city, duplicate.postcode].filter(Boolean).join(', ') || 'No contact info'}
                </p>
                <button
                  type="button"
                  onClick={useExisting}
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 text-[11px] font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                >
                  Use existing client
                </button>
              </div>
            </div>
          </div>
        )}

        <Input label="Address line 1" value={form.address_line_1} onChange={e => update('address_line_1', e.target.value)} placeholder="45 High Street" />
        <Input label="Address line 2 (optional)" value={form.address_line_2} onChange={e => update('address_line_2', e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
          <Input label="Postcode" value={form.postcode} onChange={e => update('postcode', e.target.value)} onBlur={e => update('postcode', formatPostcode(e.target.value))} error={errors.postcode} placeholder="SW1A 1AA" />
        </div>

        <TextArea label="Notes (optional)" value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Preferred contact, access details, etc." />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose?.() }} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} disabled={!isEdit && !!duplicate} className="flex-1">
            {isEdit ? 'Save changes' : duplicate ? 'Email or phone already used' : 'Add client'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
