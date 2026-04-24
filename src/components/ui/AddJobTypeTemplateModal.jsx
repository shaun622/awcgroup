import { useState } from 'react'
import { toast } from 'sonner'
import Modal from './Modal'
import Input, { TextArea } from './Input'
import Button from './Button'

/**
 * Quick inline add for a job type template, reachable from the Job Type picker.
 * Full editor (default tasks, colour, etc.) lives at /settings/job-types when
 * that page lands.
 *
 * Props:
 *   open, onClose          required
 *   createTemplate(payload) required — mutation from useJobTypeTemplates
 *   onCreated(template)    fires after successful insert with the new row
 *   zLayer                 pass 60+ when nested inside another modal (default 50)
 */
export default function AddJobTypeTemplateModal({ open, onClose, createTemplate, onCreated, zLayer = 60 }) {
  const [form, setForm] = useState({ name: '', description: '', duration: '', price: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm({ name: '', description: '', duration: '', price: '' }); setErrors({}); setSaving(false) }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const saved = await createTemplate({
        name: form.name,
        description: form.description,
        estimated_duration_minutes: form.duration ? Number(form.duration) : null,
        default_price: form.price ? Number(form.price) : null,
      })
      toast.success('Job type added')
      reset()
      onClose?.()
      onCreated?.(saved)
    } catch (err) {
      toast.error('Could not add job type', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose?.() }}
      title="Add job type"
      description="Sets up a reusable template. Full editor in Settings."
      size="sm"
      zLayer={zLayer}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Name"
          required
          autoFocus
          value={form.name}
          onChange={e => update('name', e.target.value)}
          error={errors.name}
          placeholder="e.g. Monthly rodent visit"
        />
        <TextArea
          label="Description (optional)"
          rows={2}
          value={form.description}
          onChange={e => update('description', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Typical duration (min)"
            type="number"
            min="0"
            step="15"
            value={form.duration}
            onChange={e => update('duration', e.target.value)}
          />
          <Input
            label="Default price"
            type="number"
            min="0"
            step="0.01"
            leftAdornment="£"
            value={form.price}
            onChange={e => update('price', e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose?.() }} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1">Add job type</Button>
        </div>
      </form>
    </Modal>
  )
}
