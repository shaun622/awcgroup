import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../contexts/BusinessContext'
import { DIVISION_SLUGS, getDivision } from '../../lib/divisionRegistry'
import { formatUKPhone, statusLabel, cn } from '../../lib/utils'
import Modal from './Modal'
import Input, { Select } from './Input'
import Button from './Button'

const ROLES = [
  { value: 'tech',  label: 'Technician — field-only view' },
  { value: 'admin', label: 'Admin — full access except ownership' },
]

export default function AddStaffModal({ open, onClose, onCreated, defaultDivisions, zLayer }) {
  const { business } = useBusiness()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'tech',
    divisions: defaultDivisions ?? business?.enabled_divisions ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleDivision = (slug) => {
    setForm(f => ({
      ...f,
      divisions: f.divisions.includes(slug)
        ? f.divisions.filter(s => s !== slug)
        : [...f.divisions, slug],
    }))
  }

  const reset = () => {
    setForm({ name: '', email: '', phone: '', role: 'tech', divisions: defaultDivisions ?? business?.enabled_divisions ?? [] })
    setErrors({}); setSaving(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (form.role === 'tech' && form.divisions.length === 0) errs.divisions = 'Pick at least one division'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const { data, error } = await supabase.from('staff_members').insert({
        business_id: business.id,
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        role: form.role,
        divisions: form.role === 'admin' ? [] : form.divisions,
        active: true,
      }).select().single()
      if (error) throw error
      toast.success(`${data.name} added`, { description: 'They\'ll appear in job assignment pickers.' })
      reset()
      onClose?.()
      onCreated?.(data)
    } catch (err) {
      toast.error('Could not add staff', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose?.() }} title="Add staff" description="Invite flow with email comes in a later pass — this adds them to the roster now." size="md" zLayer={zLayer}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" required autoFocus value={form.name} onChange={e => update('name', e.target.value)} error={errors.name} placeholder="e.g. Sarah Chen" />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="sarah@example.co.uk" />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} onBlur={e => update('phone', formatUKPhone(e.target.value))} placeholder="07123 456789" />
        </div>

        <Select label="Role" value={form.role} onChange={e => update('role', e.target.value)}>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>

        {form.role === 'tech' && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Divisions this tech works in</label>
            <div className="flex flex-wrap gap-2">
              {(business?.enabled_divisions ?? DIVISION_SLUGS).map(slug => {
                const div = getDivision(slug)
                const active = form.divisions.includes(slug)
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleDivision(slug)}
                    className={cn(
                      'rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all min-h-[40px] flex items-center gap-1.5',
                      active ? '' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300',
                    )}
                    style={active ? { borderColor: div.brand_hex, backgroundColor: `${div.brand_hex}15`, color: div.brand_hex } : {}}
                  >
                    <div.icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                    {div.name}
                  </button>
                )
              })}
            </div>
            {errors.divisions && <p className="text-xs text-red-500 font-medium">{errors.divisions}</p>}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose?.() }} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1">Add staff</Button>
        </div>
      </form>
    </Modal>
  )
}
