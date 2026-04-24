import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from './Modal'
import Input, { Select, TextArea } from './Input'
import Button from './Button'
import { useStaff } from '../../hooks/useStaff'

/**
 * EditJobModal — edit the editable fields of an existing job.
 * Doesn't let you change the division / client / premises (those are
 * structural; delete and re-create if they need to move).
 */
export default function EditJobModal({ open, onClose, job, updateJob, zLayer }) {
  const { staff } = useStaff({ divisionSlug: job?.division_slug })
  const [form, setForm] = useState({
    title: '', description: '',
    scheduledDate: '', scheduledTime: '09:00',
    duration: '', price: '', staffId: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open || !job) return
    const date = job.scheduled_date ? new Date(job.scheduled_date) : null
    setForm({
      title: job.title ?? '',
      description: job.description ?? '',
      scheduledDate: date ? date.toISOString().slice(0, 10) : '',
      scheduledTime: date
        ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        : '09:00',
      duration: job.scheduled_duration_minutes != null ? String(job.scheduled_duration_minutes) : '',
      price: job.price != null ? String(job.price) : '',
      staffId: job.assigned_staff_id ?? '',
    })
    setErrors({})
  }, [open, job?.id])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const scheduled_date = form.scheduledDate
        ? new Date(`${form.scheduledDate}T${form.scheduledTime || '09:00'}:00`).toISOString()
        : null
      await updateJob(job.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_date,
        scheduled_duration_minutes: form.duration ? Number(form.duration) : null,
        price: form.price ? Number(form.price) : null,
        assigned_staff_id: form.staffId || null,
      })
      toast.success('Job updated')
      onClose?.()
    } catch (err) {
      toast.error('Could not update job', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit job" description="Division, client and premises can't be changed — delete and re-create to move the job." size="md" zLayer={zLayer}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" required value={form.title} onChange={e => update('title', e.target.value)} error={errors.title} />
        <TextArea label="Description" rows={2} value={form.description} onChange={e => update('description', e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Scheduled date" type="date" value={form.scheduledDate} onChange={e => update('scheduledDate', e.target.value)} />
          <Input label="Time" type="time" value={form.scheduledTime} onChange={e => update('scheduledTime', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Duration (minutes)" type="number" min="0" step="15" value={form.duration} onChange={e => update('duration', e.target.value)} />
          <Input label="Price" leftAdornment="£" type="number" min="0" step="0.01" value={form.price} onChange={e => update('price', e.target.value)} />
        </div>

        <Select label="Assign to" value={form.staffId} onChange={e => update('staffId', e.target.value)}>
          <option value="">— Unassigned —</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.role === 'owner' ? ' (you)' : ''}</option>)}
        </Select>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1">Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}
