import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Flame, Check, X, Minus, ChevronDown, ChevronUp, Camera, Trash2,
  AlertTriangle, ClipboardCheck, Save, ShieldCheck, Loader2, Download,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input, { TextArea, Select } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import ConfirmModal from '../components/ui/ConfirmModal'
import SignaturePad from '../components/ui/SignaturePad'
import { SkeletonCard } from '../components/ui/Skeleton'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { useFireDoor } from '../hooks/useFireDoors'
import { useFireDoorAssessment, useCurrentStaff } from '../hooks/useFireDoorAssessment'
import {
  FIRE_DOOR_CHECKLIST, TOTAL_ITEMS, rollUpResponses,
} from '../lib/fireDoorChecklist'
import { cn, statusLabel } from '../lib/utils'

const URGENCIES = [
  { value: 'immediate', label: 'Immediate (within 24 hrs)' },
  { value: 'urgent',    label: 'Urgent (within 7 days)' },
  { value: 'routine',   label: 'Routine (within 28 days)' },
  { value: 'none',      label: 'No remedial action needed' },
]

export default function FireDoorAssessment() {
  const { premisesId, doorId, assessmentId: rawAssessmentId } = useParams()
  const isNew = !rawAssessmentId || rawAssessmentId === 'new'
  const assessmentId = isNew ? null : rawAssessmentId
  const navigate = useNavigate()
  const { business } = useBusiness()

  const { door, premises, loading: doorLoading } = useFireDoor(doorId)
  const { assessment, loading: assLoading, saveDraft, complete } = useFireDoorAssessment({ assessmentId, fireDoorId: doorId })
  const { staff: currentStaff, persistQualification } = useCurrentStaff()

  // ── form state ───────────────────────────────────────────────────────
  const [responses, setResponses] = useState({})
  const [defectsSummary, setDefectsSummary] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')
  const [urgency, setUrgency] = useState('')
  const [reassessmentRequired, setReassessmentRequired] = useState(false)
  const [reassessmentTargetDate, setReassessmentTargetDate] = useState('')
  const [assessorName, setAssessorName] = useState('')
  const [assessorQualification, setAssessorQualification] = useState('')
  const [assessorCompany, setAssessorCompany] = useState('')
  const [assessorSig, setAssessorSig] = useState(null) // pending data-URL or stored signed URL
  const [responsibleName, setResponsibleName] = useState('')
  const [responsibleRole, setResponsibleRole] = useState('')
  const [responsibleSig, setResponsibleSig] = useState(null)
  const [openSections, setOpenSections] = useState(() => new Set([1]))
  const [savingState, setSavingState] = useState('idle')   // 'idle' | 'saving' | 'saved'
  const [completing, setCompleting] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const readOnly = assessment?.status === 'completed'

  // ── PDF export (completed only) ──────────────────────────────────────
  const onExportPdf = async () => {
    if (!assessment || !door) return
    setExporting(true)
    try {
      const { generateDoorReportPdf, downloadPdf } = await import('../lib/fireDoorReportPdf')
      const blob = await generateDoorReportPdf({ door, premises, client: null, business, assessment })
      const dateStr = (assessment.assessed_at ?? '').slice(0, 10)
      downloadPdf(blob, `Fire-door-report-${door.ref}-${dateStr}.pdf`.replace(/\s+/g, '-'))
    } catch (err) {
      toast.error('PDF export failed', { description: err.message })
    } finally {
      setExporting(false)
    }
  }

  // ── hydrate from existing assessment ─────────────────────────────────
  useEffect(() => {
    if (!assessment) return
    setResponses(assessment.responses ?? {})
    setDefectsSummary(assessment.defects_summary ?? '')
    setRecommendedActions(assessment.recommended_actions ?? '')
    setUrgency(assessment.urgency ?? '')
    setReassessmentRequired(!!assessment.reassessment_required)
    setReassessmentTargetDate(assessment.reassessment_target_date ?? '')
    setAssessorName(assessment.assessor_name ?? '')
    setAssessorQualification(assessment.assessor_qualification ?? '')
    setAssessorCompany(assessment.assessor_company ?? '')
    setAssessorSig(assessment.assessor_signature_url ?? null)
    setResponsibleName(assessment.responsible_name ?? '')
    setResponsibleRole(assessment.responsible_role ?? '')
    setResponsibleSig(assessment.responsible_signature_url ?? null)
  }, [assessment?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── default assessor company from business name (new only) ───────────
  useEffect(() => {
    if (isNew && !assessorCompany && business?.name) setAssessorCompany(business.name)
  }, [isNew, business, assessorCompany])

  // ── debounced autosave ───────────────────────────────────────────────
  const saveTimer = useRef(null)
  const queueAutosave = useCallback((patch) => {
    if (readOnly) return
    setSavingState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const saved = await saveDraft(patch)
        setSavingState('saved')
        // Update URL once we have a real id (so refresh keeps state)
        if (isNew && saved?.id) {
          navigate(`/premises/${premisesId}/doors/${doorId}/assess/${saved.id}`, { replace: true })
        }
        setTimeout(() => setSavingState(s => s === 'saved' ? 'idle' : s), 1500)
      } catch (err) {
        setSavingState('idle')
        toast.error('Autosave failed', { description: err.message })
      }
    }, 800)
  }, [saveDraft, isNew, navigate, premisesId, doorId, readOnly])

  // ── per-item helpers ─────────────────────────────────────────────────
  const setItem = (ref, patch) => {
    setResponses(prev => {
      const next = { ...prev, [ref]: { ...prev[ref], ...patch } }
      queueAutosave({ responses: next })
      return next
    })
  }

  const setItemResult = (ref, result) => setItem(ref, { result })
  const setItemNote = (ref, note) => setItem(ref, { note })

  const removePhoto = async (ref) => {
    const r = responses[ref]
    if (r?.photo_path) {
      await supabase.storage.from('fire-door-evidence').remove([r.photo_path]).catch(() => {})
    }
    setItem(ref, { photo_url: null, photo_path: null })
  }

  const uploadPhoto = async (ref, file) => {
    if (!business || !door) return
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${business.id}/${door.id}/photo-${ref}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('fire-door-evidence')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) { toast.error('Upload failed', { description: upErr.message }); return }
    const { data: urlData } = await supabase.storage
      .from('fire-door-evidence')
      .createSignedUrl(path, 60 * 60 * 24 * 90) // 90 days
    setItem(ref, { photo_url: urlData?.signedUrl ?? null, photo_path: path })
  }

  // ── roll-up + completion gate ────────────────────────────────────────
  const roll = useMemo(() => rollUpResponses(responses), [responses])
  const allAnswered = roll.answered === TOTAL_ITEMS
  const computedOutcome = roll.outcome
  const canComplete = !readOnly && allAnswered && assessorSig && responsibleSig && assessorName.trim() && responsibleName.trim() && (computedOutcome === 'pass' || urgency)

  // ── section toggle ───────────────────────────────────────────────────
  const toggleSection = (n) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      return next
    })
  }
  const expandAll = () => setOpenSections(new Set(FIRE_DOOR_CHECKLIST.map(s => s.section)))
  const collapseAll = () => setOpenSections(new Set())

  // ── bulk mark remaining pass ─────────────────────────────────────────
  const unansweredCount = useMemo(() => {
    let n = 0
    for (const sec of FIRE_DOOR_CHECKLIST) {
      for (const it of sec.items) if (!responses[it.ref]?.result) n++
    }
    return n
  }, [responses])

  const bulkMarkPass = () => {
    const next = { ...responses }
    for (const sec of FIRE_DOOR_CHECKLIST) {
      for (const it of sec.items) {
        if (!next[it.ref]?.result) next[it.ref] = { ...(next[it.ref] || {}), result: 'pass' }
      }
    }
    setResponses(next)
    queueAutosave({ responses: next })
    setBulkOpen(false)
    toast.success(`${unansweredCount} ${unansweredCount === 1 ? 'item' : 'items'} marked as pass`)
  }

  // ── "Use my details" toggle ─────────────────────────────────────────
  const fillMyDetails = () => {
    if (currentStaff) {
      setAssessorName(currentStaff.name || '')
      setAssessorQualification(currentStaff.qualification || '')
    }
    if (business?.name) setAssessorCompany(business.name)
    queueAutosave({
      assessor_name: currentStaff?.name || '',
      assessor_qualification: currentStaff?.qualification || '',
      assessor_company: business?.name || '',
    })
  }

  // ── final completion ─────────────────────────────────────────────────
  const onComplete = async () => {
    if (!canComplete) return
    setCompleting(true)
    try {
      // Upload pending signatures (data URLs → storage)
      const assessorUrl = await uploadSignatureIfPending('assessor', assessorSig, business.id, door.id)
      const responsibleUrl = await uploadSignatureIfPending('responsible', responsibleSig, business.id, door.id)

      // Persist qualification back to staff_members if newly entered
      if (currentStaff && assessorQualification && assessorQualification !== currentStaff.qualification) {
        persistQualification(assessorQualification).catch(() => {})
      }

      const finalPatch = {
        responses,
        outcome: computedOutcome,
        defects_summary: defectsSummary || null,
        recommended_actions: recommendedActions || null,
        urgency: urgency || null,
        reassessment_required: reassessmentRequired,
        reassessment_target_date: reassessmentTargetDate || null,
        assessor_staff_id: currentStaff?.id ?? null,
        assessor_name: assessorName.trim(),
        assessor_qualification: assessorQualification.trim() || null,
        assessor_company: assessorCompany.trim() || null,
        assessor_signature_url: assessorUrl,
        assessor_signed_at: new Date().toISOString(),
        responsible_name: responsibleName.trim(),
        responsible_role: responsibleRole.trim() || null,
        responsible_signature_url: responsibleUrl,
        responsible_signed_at: new Date().toISOString(),
        // Door snapshots — preserve metadata at the moment of assessment
        door_ref_snapshot: door?.ref ?? null,
        door_location_snapshot: door?.location ?? null,
        door_rating_snapshot: door?.rating === 'custom' ? door?.rating_custom : door?.rating ?? null,
        door_floor_snapshot: door?.floor ?? null,
      }
      await complete(finalPatch)
      toast.success('Assessment complete', { description: `${roll.pass} pass · ${roll.fail} fail · ${roll.na} N/A` })
      navigate(`/premises/${premisesId}/doors/${doorId}`)
    } catch (err) {
      toast.error('Could not complete', { description: err.message })
    } finally {
      setCompleting(false)
    }
  }

  if (doorLoading || assLoading) {
    return <PageWrapper size="full"><SkeletonCard /></PageWrapper>
  }
  if (!door) {
    return (
      <PageWrapper size="full">
        <EmptyState icon={Flame} title="Door not found" />
      </PageWrapper>
    )
  }

  const ratingLabel = door.rating === 'custom' ? door.rating_custom : door.rating

  return (
    <PageWrapper size="full">
      <button
        onClick={() => isNew && roll.answered > 0 && !readOnly ? setExitOpen(true) : navigate(`/premises/${premisesId}/doors/${doorId}`)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> {door.ref}
      </button>

      {/* Header */}
      <Card className="!p-5 mb-4 sticky top-[124px] md:top-[110px] z-20 backdrop-blur-md bg-white/85 dark:bg-gray-900/85">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-fire-50 dark:bg-fire-950/40 text-fire-600 dark:text-fire-400 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant={readOnly ? 'success' : 'primary'}>
                {readOnly ? 'Completed' : 'In progress'}
              </Badge>
              {ratingLabel && <Badge variant="default">{ratingLabel}</Badge>}
              {!readOnly && <SaveIndicator state={savingState} />}
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">
              {door.ref} — Fire door assessment
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {premises?.name || premises?.address_line_1}
              {door.location && ` · ${door.location}`}
            </p>
          </div>
          <div className="text-right shrink-0 flex items-start gap-2">
            <div>
              <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {roll.answered}<span className="text-gray-400">/{TOTAL_ITEMS}</span>
              </p>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">items</p>
            </div>
            {readOnly && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={onExportPdf}
                loading={exporting}
              >
                PDF
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          <div className="h-full flex">
            <div className="bg-emerald-500 transition-all" style={{ width: `${(roll.pass / TOTAL_ITEMS) * 100}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${(roll.fail / TOTAL_ITEMS) * 100}%` }} />
            <div className="bg-gray-400 transition-all" style={{ width: `${(roll.na / TOTAL_ITEMS) * 100}%` }} />
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {roll.pass} pass</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {roll.fail} fail</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> {roll.na} N/A</span>
        </div>
      </Card>

      {/* Quick actions */}
      {!readOnly && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={expandAll}>Expand all</Button>
          <Button size="sm" variant="secondary" onClick={collapseAll}>Collapse all</Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Check className="w-3.5 h-3.5" />}
            onClick={() => setBulkOpen(true)}
            disabled={unansweredCount === 0}
          >
            Mark remaining as pass ({unansweredCount})
          </Button>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3 mb-6">
        {FIRE_DOOR_CHECKLIST.map(section => {
          const isOpen = openSections.has(section.section)
          const sectionStats = sectionRollup(responses, section)
          return (
            <Card key={section.section} className="!p-0 overflow-hidden">
              <button
                onClick={() => toggleSection(section.section)}
                className="w-full text-left flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 text-xs font-bold tabular-nums">
                    {section.section}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{section.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {sectionStats.answered}/{section.items.length} answered
                      {sectionStats.fail > 0 && ` · ${sectionStats.fail} fail`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sectionStats.fail > 0 && <Badge variant="danger">{sectionStats.fail}</Badge>}
                  {sectionStats.answered === section.items.length && sectionStats.fail === 0 && (
                    <Badge variant="success">Done</Badge>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                  {section.items.map(item => (
                    <ChecklistRow
                      key={item.ref}
                      item={item}
                      response={responses[item.ref] || {}}
                      readOnly={readOnly}
                      onSetResult={r => setItemResult(item.ref, r)}
                      onSetNote={n => setItemNote(item.ref, n)}
                      onUploadPhoto={f => uploadPhoto(item.ref, f)}
                      onRemovePhoto={() => removePhoto(item.ref)}
                    />
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Outcome */}
      <h2 className="section-title mb-2">Outcome</h2>
      <Card className="mb-4 space-y-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Computed result:</p>
          {computedOutcome ? (
            <Badge variant={computedOutcome === 'pass' ? 'success' : computedOutcome === 'fail' ? 'danger' : 'warning'}>
              {statusLabel(computedOutcome)}
            </Badge>
          ) : (
            <span className="text-sm text-gray-400">— answer all items to see</span>
          )}
        </div>

        <TextArea
          label="Defects summary"
          value={defectsSummary}
          onChange={e => { setDefectsSummary(e.target.value); queueAutosave({ defects_summary: e.target.value }) }}
          rows={3}
          disabled={readOnly}
          placeholder="Brief summary of any defects observed."
        />

        <TextArea
          label="Recommended actions"
          value={recommendedActions}
          onChange={e => { setRecommendedActions(e.target.value); queueAutosave({ recommended_actions: e.target.value }) }}
          rows={3}
          disabled={readOnly}
          placeholder="What needs doing, by whom, and to what standard."
        />

        <Select
          label="Urgency"
          value={urgency}
          onChange={e => { setUrgency(e.target.value); queueAutosave({ urgency: e.target.value || null }) }}
          disabled={readOnly}
        >
          <option value="">— select —</option>
          {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </Select>

        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reassessmentRequired}
              onChange={e => { setReassessmentRequired(e.target.checked); queueAutosave({ reassessment_required: e.target.checked }) }}
              disabled={readOnly}
              className="mt-1 w-4 h-4 rounded accent-brand-500"
            />
            <div>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Reassessment required</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Schedule a follow-up inspection.</p>
            </div>
          </label>
          {reassessmentRequired && (
            <div className="ml-7 max-w-xs animate-slide-down">
              <Input
                label="Target date"
                type="date"
                value={reassessmentTargetDate || ''}
                onChange={e => { setReassessmentTargetDate(e.target.value); queueAutosave({ reassessment_target_date: e.target.value || null }) }}
                disabled={readOnly}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Signatures */}
      <h2 className="section-title mb-2">Sign-off</h2>
      <Card className="mb-6 space-y-5">
        {/* Assessor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Assessor</p>
            {!readOnly && currentStaff && (
              <button
                type="button"
                onClick={fillMyDetails}
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                Use my details
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Name"
              value={assessorName}
              onChange={e => { setAssessorName(e.target.value); queueAutosave({ assessor_name: e.target.value }) }}
              disabled={readOnly}
              required
            />
            <Input
              label="Qualification / cert no."
              value={assessorQualification}
              onChange={e => { setAssessorQualification(e.target.value); queueAutosave({ assessor_qualification: e.target.value }) }}
              disabled={readOnly}
              hint={currentStaff && !currentStaff.qualification && assessorQualification ? 'We\'ll save this on your profile' : undefined}
            />
          </div>
          <Input
            label="Company"
            value={assessorCompany}
            onChange={e => { setAssessorCompany(e.target.value); queueAutosave({ assessor_company: e.target.value }) }}
            disabled={readOnly}
          />
          <SignaturePad
            label="Signature"
            value={typeof assessorSig === 'string' && assessorSig.startsWith('http') ? assessorSig : (assessorSig || null)}
            onChange={v => setAssessorSig(v)}
            disabled={readOnly}
          />
        </div>

        <hr className="border-gray-100 dark:border-gray-800" />

        {/* Responsible person */}
        <div className="space-y-3">
          <p className="font-semibold text-gray-900 dark:text-gray-100">Responsible person</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Name"
              value={responsibleName}
              onChange={e => { setResponsibleName(e.target.value); queueAutosave({ responsible_name: e.target.value }) }}
              disabled={readOnly}
              required
            />
            <Input
              label="Role / position"
              value={responsibleRole}
              onChange={e => { setResponsibleRole(e.target.value); queueAutosave({ responsible_role: e.target.value }) }}
              disabled={readOnly}
              placeholder="Building owner, FM, RP…"
            />
          </div>
          <SignaturePad
            label="Signature"
            value={typeof responsibleSig === 'string' && responsibleSig.startsWith('http') ? responsibleSig : (responsibleSig || null)}
            onChange={v => setResponsibleSig(v)}
            disabled={readOnly}
          />
        </div>
      </Card>

      {/* Footer actions */}
      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-20">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0 text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {!allAnswered && `${TOTAL_ITEMS - roll.answered} item${TOTAL_ITEMS - roll.answered === 1 ? '' : 's'} remaining · `}
              {!assessorSig && 'Assessor signature missing · '}
              {!responsibleSig && 'Responsible person signature missing · '}
              {allAnswered && computedOutcome !== 'pass' && !urgency && 'Set urgency'}
              {canComplete && 'Ready to complete'}
            </div>
            <Button
              onClick={onComplete}
              loading={completing}
              disabled={!canComplete}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Complete assessment
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={`Mark ${unansweredCount} remaining ${unansweredCount === 1 ? 'item' : 'items'} as pass?`}
        description="Use this once you've visually checked everything else and want to skip individual taps. You can still flip individual items afterwards."
        confirmLabel={`Mark ${unansweredCount} as pass`}
        destructive={false}
        onConfirm={bulkMarkPass}
      />
      <ConfirmModal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Leave assessment?"
        description="Your progress is autosaved as a draft — you can resume from this door's history anytime."
        confirmLabel="Leave"
        destructive={false}
        onConfirm={() => navigate(`/premises/${premisesId}/doors/${doorId}`)}
      />
    </PageWrapper>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */

function ChecklistRow({ item, response, readOnly, onSetResult, onSetNote, onUploadPhoto, onRemovePhoto }) {
  const fileRef = useRef(null)

  const result = response.result
  const showPhoto = result === 'fail'

  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xs font-semibold tabular-nums text-gray-400 mt-0.5 shrink-0 min-w-[28px]">{item.ref}</span>
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-snug">
            {item.label}
            {item.conditional && <span className="ml-1 text-xs text-gray-400">(if applicable)</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ResultButton kind="pass" active={result === 'pass'} disabled={readOnly} onClick={() => onSetResult('pass')} />
          <ResultButton kind="fail" active={result === 'fail'} disabled={readOnly} onClick={() => onSetResult('fail')} />
          <ResultButton kind="na"   active={result === 'na'}   disabled={readOnly} onClick={() => onSetResult('na')} />
        </div>
      </div>

      {(result || response.note) && (
        <div className="pl-9 space-y-2">
          <Input
            placeholder={result === 'fail' ? 'Defect details (required)' : 'Note (optional)'}
            value={response.note ?? ''}
            onChange={e => onSetNote(e.target.value)}
            disabled={readOnly}
          />

          {showPhoto && (
            <div className="flex items-center gap-2">
              {response.photo_url ? (
                <div className="relative">
                  <img src={response.photo_url} alt="Defect" className="w-20 h-20 rounded-xl object-cover border border-gray-200 dark:border-gray-800" />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={onRemovePhoto}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-card"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                !readOnly && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 px-3 py-2 min-h-tap rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-400"
                  >
                    <Camera className="w-3.5 h-3.5" /> Add photo evidence
                  </button>
                )
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) onUploadPhoto(f)
                  e.target.value = ''
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultButton({ kind, active, disabled, onClick }) {
  const cfg = {
    pass: {
      Icon: Check,
      label: 'Pass',
      activeClass: 'bg-emerald-500 text-white border-emerald-500',
      idleClass: 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-emerald-400 hover:text-emerald-600',
    },
    fail: {
      Icon: X,
      label: 'Fail',
      activeClass: 'bg-red-500 text-white border-red-500',
      idleClass: 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-red-400 hover:text-red-600',
    },
    na: {
      Icon: Minus,
      label: 'N/A',
      activeClass: 'bg-gray-500 text-white border-gray-500',
      idleClass: 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400 hover:text-gray-700',
    },
  }[kind]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'min-h-[36px] inline-flex items-center justify-center gap-1 px-2.5 rounded-lg text-xs font-semibold border-2 transition-all disabled:opacity-50',
        active ? cfg.activeClass : cfg.idleClass,
      )}
      title={cfg.label}
    >
      <cfg.Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      <span className="hidden sm:inline">{cfg.label}</span>
    </button>
  )
}

function SaveIndicator({ state }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving…
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="w-3 h-3" /> Saved
      </span>
    )
  }
  return null
}

/* ─── helpers ────────────────────────────────────────────────────────── */

function sectionRollup(responses, section) {
  let pass = 0, fail = 0, na = 0
  for (const item of section.items) {
    const r = responses[item.ref]?.result
    if (r === 'pass') pass++
    else if (r === 'fail') fail++
    else if (r === 'na') na++
  }
  return { pass, fail, na, answered: pass + fail + na }
}

async function uploadSignatureIfPending(role, value, businessId, doorId) {
  // Already a stored URL — leave as-is
  if (!value) return null
  if (typeof value === 'string' && value.startsWith('http')) return value

  // Data URL → blob → upload
  const m = /^data:(image\/[^;]+);base64,(.+)$/.exec(value)
  if (!m) return null
  const [, mime, b64] = m
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: mime })
  const ext = mime === 'image/png' ? 'png' : 'jpg'
  const path = `${businessId}/${doorId}/sig-${role}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('fire-door-evidence').upload(path, blob, { contentType: mime })
  if (error) throw error
  const { data } = await supabase.storage.from('fire-door-evidence').createSignedUrl(path, 60 * 60 * 24 * 365 * 5) // 5y
  return data?.signedUrl ?? null
}
