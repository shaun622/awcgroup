import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Modal from './Modal'
import Input, { Select, TextArea } from './Input'
import Button from './Button'
import Avatar from './Avatar'
import AddClientModal from './AddClientModal'
import AddPremisesModal from './AddPremisesModal'
import AddJobTypeTemplateModal from './AddJobTypeTemplateModal'
import AddStaffModal from './AddStaffModal'
import { useDivision } from '../../contexts/DivisionContext'
import { useClients } from '../../hooks/useClients'
import { usePremises } from '../../hooks/usePremises'
import { useJobTypeTemplates } from '../../hooks/useJobTypeTemplates'
import { useStaff } from '../../hooks/useStaff'
import { getDivision } from '../../lib/divisionRegistry'
import { cn } from '../../lib/utils'

const ADD_SENTINEL = '__add__'

/**
 * NewJobModal — create a job.
 *
 * Props:
 *   open, onClose               required
 *   client                      optional: pre-fills and locks the client picker
 *   premises                    optional: pre-fills and locks the premises picker
 *   createJob                   required: async mutation
 *   onCreated(job)              optional: after success (defaults to nothing)
 */
export default function NewJobModal({ open, onClose, client: lockedClient, premises: lockedPremises, createJob, onCreated }) {
  const { currentDivision, available } = useDivision()
  const defaultDivision = lockedPremises?.division_slug ?? currentDivision?.slug ?? available[0]?.slug ?? 'pest'

  const [divisionSlug, setDivisionSlug] = useState(defaultDivision)
  const [clientId, setClientId] = useState(lockedClient?.id ?? '')
  const [premisesId, setPremisesId] = useState(lockedPremises?.id ?? '')
  const [templateId, setTemplateId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [duration, setDuration] = useState('')
  const [price, setPrice] = useState('')
  const [staffId, setStaffId] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Reset on open
  useEffect(() => {
    if (!open) return
    setDivisionSlug(lockedPremises?.division_slug ?? currentDivision?.slug ?? available[0]?.slug ?? 'pest')
    setClientId(lockedClient?.id ?? '')
    setPremisesId(lockedPremises?.id ?? '')
    setTemplateId('')
    setTitle(''); setDescription(''); setDuration(''); setPrice('')
    setStaffId('')
    setErrors({}); setSaving(false)
    // default scheduled date = today
    const d = new Date()
    setScheduledDate(d.toISOString().slice(0, 10))
    setScheduledTime('09:00')
  }, [open, lockedClient?.id, lockedPremises?.id, currentDivision?.slug, available])

  const { allClients, addClient } = useClients()
  const { premises: clientPremises, addPremises } = usePremises({
    clientId: clientId || undefined,
    divisionSlug,
  })
  const { templates, createTemplate } = useJobTypeTemplates(divisionSlug)
  const { staff } = useStaff({ divisionSlug })

  // Inline-add modals triggered by the __add__ sentinel on each picker
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addPremisesOpen, setAddPremisesOpen] = useState(false)
  const [addJobTypeOpen, setAddJobTypeOpen] = useState(false)
  const [addStaffOpen, setAddStaffOpen] = useState(false)
  const [newStaffId, setNewStaffId] = useState(null)

  // Narrow client list if divisions ever become client-scoped; for now they're shared
  const clientOptions = useMemo(() => allClients ?? [], [allClients])

  // When template changes, pre-fill title/duration/price from the template
  useEffect(() => {
    if (!templateId) return
    const t = templates.find(x => x.id === templateId)
    if (!t) return
    if (!title) setTitle(t.name)
    if (!duration && t.estimated_duration_minutes) setDuration(String(t.estimated_duration_minutes))
    if (!price && t.default_price) setPrice(String(t.default_price))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId])

  // When division changes, clear premises + template (they're division-scoped)
  useEffect(() => {
    setPremisesId(lockedPremises?.id ?? '')
    setTemplateId('')
  }, [divisionSlug, lockedPremises?.id])

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!clientId) errs.clientId = 'Pick a client'
    if (!title.trim()) errs.title = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const template = templates.find(t => t.id === templateId)
      const scheduled_date = scheduledDate
        ? new Date(`${scheduledDate}T${scheduledTime || '09:00'}:00`).toISOString()
        : null

      const job = await createJob({
        division_slug: divisionSlug,
        client_id: clientId,
        premises_id: premisesId || null,
        job_type: template?.name ?? null,
        title: title.trim(),
        description: description.trim() || null,
        scheduled_date,
        scheduled_duration_minutes: duration ? Number(duration) : null,
        assigned_staff_id: staffId || null,
        price: price ? Number(price) : null,
      })
      toast.success('Job scheduled', { description: job.title })
      onClose?.()
      onCreated?.(job)
    } catch (err) {
      toast.error('Could not schedule job', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => onClose?.()} title="Schedule job" description="Fill in as little or as much as you like — you can edit later." size="md">
      <form onSubmit={submit} className="space-y-4">
        {/* Division picker */}
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
        )}

        {/* Client picker (or lock info) */}
        {lockedClient ? (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
            <Avatar name={lockedClient.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{lockedClient.name}</p>
              <p className="text-xs text-gray-500">Client · locked to this record</p>
            </div>
          </div>
        ) : (
          <Select
            label="Client"
            value={clientId}
            onChange={e => {
              if (e.target.value === ADD_SENTINEL) { setAddClientOpen(true); return }
              setClientId(e.target.value)
            }}
            error={errors.clientId}
            required
          >
            <option value="">— Pick a client —</option>
            {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option disabled>──────────</option>
            <option value={ADD_SENTINEL}>+ Add new client…</option>
          </Select>
        )}

        {/* Premises picker (optional) */}
        {!lockedPremises && clientId && (
          <Select
            label="Premises (optional)"
            value={premisesId}
            onChange={e => {
              if (e.target.value === ADD_SENTINEL) { setAddPremisesOpen(true); return }
              setPremisesId(e.target.value)
            }}
            hint={clientPremises.length === 0 ? 'No premises for this client in this division yet.' : undefined}
          >
            <option value="">— No specific premises —</option>
            {clientPremises.map(p => (
              <option key={p.id} value={p.id}>
                {p.name ? `${p.name} · ${p.address_line_1}` : p.address_line_1}
                {p.postcode ? ` (${p.postcode})` : ''}
              </option>
            ))}
            <option disabled>──────────</option>
            <option value={ADD_SENTINEL}>+ Add new premises…</option>
          </Select>
        )}
        {lockedPremises && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
            <p className="text-xs text-gray-500">Premises · locked</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {lockedPremises.name ? `${lockedPremises.name} — ` : ''}
              {lockedPremises.address_line_1}
            </p>
          </div>
        )}

        {/* Job type template */}
        <Select
          label="Job type"
          value={templateId}
          onChange={e => {
            if (e.target.value === ADD_SENTINEL) { setAddJobTypeOpen(true); return }
            setTemplateId(e.target.value)
          }}
          hint={templates.length === 0 ? 'No templates in this division yet — add one inline.' : 'Picking a template pre-fills title, duration and price.'}
        >
          <option value="">— None —</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}{t.default_price ? ` · £${Number(t.default_price).toFixed(0)}` : ''}
            </option>
          ))}
          <option disabled>──────────</option>
          <option value={ADD_SENTINEL}>+ Add new job type…</option>
        </Select>

        <Input
          label="Title"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          error={errors.title}
          placeholder="e.g. Monthly pest visit"
        />

        <TextArea
          label="Description (optional)"
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Any details the tech should know"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Scheduled date"
            type="date"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
          />
          <Input
            label="Time"
            type="time"
            value={scheduledTime}
            onChange={e => setScheduledTime(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duration (minutes)"
            type="number"
            min="0"
            step="15"
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />
          <Input
            label="Price (£)"
            leftAdornment="£"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </div>

        <Select
          label="Assign to (optional)"
          value={staffId}
          onChange={e => {
            if (e.target.value === ADD_SENTINEL) { setAddStaffOpen(true); return }
            setStaffId(e.target.value)
          }}
        >
          <option value="">— Unassigned —</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.role === 'owner' ? ' (you)' : ''}</option>)}
          {/* Newly-added staff aren't in the hook's state yet — keep them
              selectable until the next refetch cycle catches up. */}
          {newStaffId && !staff.some(s => s.id === newStaffId.id) && (
            <option value={newStaffId.id}>{newStaffId.name}</option>
          )}
          <option disabled>──────────</option>
          <option value={ADD_SENTINEL}>+ Add new staff…</option>
        </Select>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onClose?.()} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1">Schedule job</Button>
        </div>
      </form>

      {/* Nested add-X modals. zLayer 60 so they sit above the parent (z 50). */}
      <AddClientModal
        open={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        addClient={addClient}
        onCreated={(c) => { setClientId(c.id); setAddClientOpen(false) }}
        zLayer={60}
      />
      <AddPremisesModal
        open={addPremisesOpen}
        onClose={() => setAddPremisesOpen(false)}
        client={allClients.find(c => c.id === clientId) || null}
        addPremises={addPremises}
        onCreated={(p) => { setPremisesId(p.id); setAddPremisesOpen(false) }}
        zLayer={60}
      />
      <AddJobTypeTemplateModal
        open={addJobTypeOpen}
        onClose={() => setAddJobTypeOpen(false)}
        createTemplate={createTemplate}
        onCreated={(t) => { setTemplateId(t.id); setAddJobTypeOpen(false) }}
        zLayer={60}
      />
      <AddStaffModal
        open={addStaffOpen}
        onClose={() => setAddStaffOpen(false)}
        defaultDivisions={[divisionSlug]}
        onCreated={(s) => { setNewStaffId(s); setStaffId(s.id); setAddStaffOpen(false) }}
        zLayer={60}
      />
    </Modal>
  )
}
