/**
 * Fire-door PDF report generation.
 *
 * Two exports:
 *   - generateDoorReportPdf({ door, premises, client, business, assessment })
 *       → Blob with a single-door assessment report.
 *   - generateBuildingReportPdf({ premises, client, business, doors, assessments })
 *       → Blob with a cover page + index + per-door section for the whole site.
 *
 * Both functions are async because they fetch signature + photo PNGs from
 * Supabase Storage signed URLs and embed them in the PDF.
 *
 * The producers use jsPDF + jspdf-autotable. Loaded via dynamic import so
 * the ~100 KB PDF bundle only hits the wire when a user clicks "Export PDF".
 */

import { FIRE_DOOR_CHECKLIST, TOTAL_ITEMS, rollUpResponses } from './fireDoorChecklist'

// ─── Brand ─────────────────────────────────────────────────────────────
const BRAND = {
  fire: [220, 38, 38],     // #dc2626 — fire-500
  fireLight: [254, 226, 226], // #fee2e2 — fire-100
  ink: [17, 24, 39],       // gray-900
  muted: [107, 114, 128],  // gray-500
  rule: [229, 231, 235],   // gray-200
  passBg: [220, 252, 231], // emerald-100
  passInk: [4, 120, 87],   // emerald-700
  failBg: [254, 226, 226], // red-100
  failInk: [185, 28, 28],  // red-700
  naBg:   [243, 244, 246], // gray-100
  naInk:  [75, 85, 99],    // gray-600
  warnBg: [254, 243, 199], // amber-100
  warnInk:[180, 83, 9],    // amber-700
}

// ─── Public API ────────────────────────────────────────────────────────

export async function generateDoorReportPdf(args) {
  const { jsPDF, autoTable } = await loadJsPdf()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  await renderDoorChapter(doc, args, { autoTable, isFirst: true })
  finaliseFooter(doc)
  return doc.output('blob')
}

export async function generateBuildingReportPdf({ premises, client, business, doors, assessments }) {
  const { jsPDF, autoTable } = await loadJsPdf()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  // Map: door.id → latest completed assessment
  const latestByDoor = new Map()
  for (const a of assessments ?? []) {
    if (a.status !== 'completed') continue
    const cur = latestByDoor.get(a.fire_door_id)
    if (!cur || new Date(a.assessed_at) > new Date(cur.assessed_at)) {
      latestByDoor.set(a.fire_door_id, a)
    }
  }

  renderBuildingCover(doc, { premises, client, business, doors, latestByDoor }, { autoTable })
  renderBuildingIndex(doc, { doors, latestByDoor }, { autoTable })

  for (const door of doors) {
    const latest = latestByDoor.get(door.id)
    if (!latest) continue
    doc.addPage()
    await renderDoorChapter(doc, {
      door, premises, client, business, assessment: latest,
    }, { autoTable, isFirst: false })
  }

  finaliseFooter(doc)
  return doc.output('blob')
}

/** Convenience: open the Blob in a new tab (or download). */
export function downloadPdf(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ─── Per-door chapter ──────────────────────────────────────────────────

async function renderDoorChapter(doc, { door, premises, client, business, assessment }, { autoTable, isFirst }) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const margin = 36

  // ─ Title bar ─
  doc.setFillColor(...BRAND.fire)
  doc.rect(0, 0, W, 60, 'F')
  doc.setTextColor(255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FIRE DOOR ASSESSMENT REPORT', margin, 38)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`BS 8214:2016  ·  RRO 2005`, W - margin, 38, { align: 'right' })

  let y = 88

  // ─ Building / client header ─
  doc.setTextColor(...BRAND.muted)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPERTY', margin, y)
  doc.text('CLIENT', W / 2, y)

  doc.setTextColor(...BRAND.ink)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(premises?.name || premises?.address_line_1 || '—', margin, y + 14)
  doc.text(client?.name || '—', W / 2, y + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.muted)
  const addr = [premises?.address_line_1, premises?.address_line_2, premises?.city, premises?.postcode].filter(Boolean).join(', ')
  doc.text(addr || '', margin, y + 28, { maxWidth: W / 2 - margin - 10 })
  doc.text(business?.name || '', W / 2, y + 28)

  y += 56

  // ─ Door header (large) ─
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margin, y, W - margin * 2, 70, 6, 6, 'F')

  doc.setTextColor(...BRAND.ink)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(door?.ref || '—', margin + 16, y + 28)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND.muted)
  const doorMeta = [
    door?.location,
    door?.floor && `Floor ${door.floor}`,
    door?.rating === 'custom' ? door?.rating_custom : door?.rating,
  ].filter(Boolean).join('  ·  ')
  doc.text(doorMeta || '—', margin + 16, y + 46)

  // Assessed-on date (right side)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.muted)
  doc.text('ASSESSED', W - margin - 16, y + 22, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...BRAND.ink)
  doc.text(formatDate(assessment?.assessed_at), W - margin - 16, y + 36, { align: 'right' })

  y += 86

  // ─ Outcome banner ─
  const roll = rollUpResponses(assessment?.responses ?? {})
  const outcome = assessment?.outcome ?? roll.outcome
  const outcomeMeta = outcomeStyle(outcome)

  doc.setFillColor(...outcomeMeta.bg)
  doc.roundedRect(margin, y, W - margin * 2, 36, 4, 4, 'F')
  doc.setTextColor(...outcomeMeta.ink)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(`OVERALL: ${outcomeMeta.label}`, margin + 14, y + 23)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${roll.pass} pass  ·  ${roll.fail} fail  ·  ${roll.na} N/A  ·  ${roll.answered}/${TOTAL_ITEMS} answered`,
    W - margin - 14, y + 23, { align: 'right' }
  )

  y += 52

  // ─ Assessor + responsible person row ─
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.muted)
  doc.text('ASSESSOR', margin, y)
  doc.text('RESPONSIBLE PERSON', W / 2, y)

  doc.setTextColor(...BRAND.ink)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(assessment?.assessor_name || '—', margin, y + 14)
  doc.text(assessment?.responsible_name || '—', W / 2, y + 14)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND.muted)
  doc.setFontSize(9)
  doc.text(
    [assessment?.assessor_qualification, assessment?.assessor_company].filter(Boolean).join('  ·  ') || '',
    margin, y + 26
  )
  doc.text(assessment?.responsible_role || '', W / 2, y + 26)

  y += 44

  // ─ Section tables ─
  for (const section of FIRE_DOOR_CHECKLIST) {
    const rows = section.items.map(item => {
      const r = assessment?.responses?.[item.ref]
      const result = r?.result
      const note = r?.note ?? ''
      const photo = r?.photo_url ? '\u{1F4F7}' : ''  // 📷
      return [
        item.ref,
        item.label,
        resultLabel(result),
        [note, photo].filter(Boolean).join('  '),
      ]
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [[`${section.section}. ${section.title}`, '', '', '']],
      body: rows,
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, lineColor: BRAND.rule, lineWidth: 0.4, textColor: BRAND.ink },
      headStyles: { fillColor: [245, 247, 250], textColor: BRAND.ink, fontStyle: 'bold', fontSize: 10, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 36, halign: 'center', textColor: BRAND.muted, fontSize: 8 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 60, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 130 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return
        const result = data.row.raw[2]
        if (data.column.index === 2) {
          if (result === 'PASS') { data.cell.styles.fillColor = BRAND.passBg; data.cell.styles.textColor = BRAND.passInk }
          else if (result === 'FAIL') { data.cell.styles.fillColor = BRAND.failBg; data.cell.styles.textColor = BRAND.failInk }
          else if (result === 'N/A') { data.cell.styles.fillColor = BRAND.naBg; data.cell.styles.textColor = BRAND.naInk }
          else { data.cell.styles.textColor = BRAND.muted }
        }
      },
    })
    y = doc.lastAutoTable.finalY + 8
    if (y > H - 120) { doc.addPage(); y = 50 }
  }

  // ─ Defects + actions + urgency ─
  if (y > H - 200) { doc.addPage(); y = 50 }
  y = textBlock(doc, 'DEFECTS SUMMARY', assessment?.defects_summary || '—', margin, y, W - margin * 2)
  y = textBlock(doc, 'RECOMMENDED ACTIONS', assessment?.recommended_actions || '—', margin, y + 8, W - margin * 2)

  if (assessment?.urgency) {
    if (y > H - 60) { doc.addPage(); y = 50 }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.muted)
    doc.text('URGENCY', margin, y + 14)
    doc.setFontSize(11)
    doc.setTextColor(...BRAND.ink)
    doc.text(urgencyLabel(assessment.urgency), margin, y + 28)
    y += 36
  }

  if (assessment?.reassessment_required) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.muted)
    doc.text('REASSESSMENT', margin, y + 14)
    doc.setFontSize(11)
    doc.setTextColor(...BRAND.ink)
    const date = assessment.reassessment_target_date ? `Required by ${formatDate(assessment.reassessment_target_date)}` : 'Required'
    doc.text(date, margin, y + 28)
    y += 36
  }

  // ─ Signatures ─
  if (y > H - 180) { doc.addPage(); y = 50 }
  await drawSignaturePair(doc, {
    x1: margin, x2: W / 2 + 8,
    y, w: W / 2 - margin - 8, h: 70,
    leftLabel: 'ASSESSOR SIGNATURE',
    leftName: assessment?.assessor_name,
    leftSubtext: [assessment?.assessor_qualification, formatDateTime(assessment?.assessor_signed_at)].filter(Boolean).join(' · '),
    leftSig: assessment?.assessor_signature_url,
    rightLabel: 'RESPONSIBLE PERSON',
    rightName: assessment?.responsible_name,
    rightSubtext: [assessment?.responsible_role, formatDateTime(assessment?.responsible_signed_at)].filter(Boolean).join(' · '),
    rightSig: assessment?.responsible_signature_url,
  })
}

// ─── Building cover + index ────────────────────────────────────────────

function renderBuildingCover(doc, { premises, client, business, doors, latestByDoor }, { autoTable }) {
  const W = doc.internal.pageSize.getWidth()
  const margin = 36

  // Tall fire-coloured band
  doc.setFillColor(...BRAND.fire)
  doc.rect(0, 0, W, 200, 'F')

  doc.setTextColor(255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('AWC GROUP  ·  FIRE SAFETY', margin, 60)

  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('Fire door', margin, 110)
  doc.text('compliance report', margin, 142)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated ${formatDate(new Date())}`, margin, 178)

  // Body
  let y = 240
  doc.setTextColor(...BRAND.muted)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPERTY', margin, y)
  doc.text('CLIENT', W / 2, y)

  doc.setTextColor(...BRAND.ink)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(premises?.name || premises?.address_line_1 || '—', margin, y + 18)
  doc.text(client?.name || '—', W / 2, y + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND.muted)
  const addr = [premises?.address_line_1, premises?.address_line_2, premises?.city, premises?.postcode].filter(Boolean).join(', ')
  doc.text(addr || '', margin, y + 36)
  doc.text(business?.name || '', W / 2, y + 36)

  y += 80

  // Summary stats
  const total = doors.length
  let pass = 0, fail = 0, investigation = 0, unassessed = 0, overdue = 0
  for (const d of doors) {
    const a = latestByDoor.get(d.id)
    if (!a) { unassessed++; continue }
    if (a.outcome === 'pass') pass++
    else if (a.outcome === 'fail') fail++
    else investigation++
  }
  for (const d of doors) {
    if (d.next_due_at && new Date(d.next_due_at) < new Date()) overdue++
  }

  const passRate = (pass + fail + investigation) > 0
    ? Math.round((pass / (pass + fail + investigation)) * 100)
    : null

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Total doors', 'Pass', 'Fail', 'Needs invest.', 'Unassessed', 'Overdue']],
    body: [[total, pass, fail, investigation, unassessed, overdue]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 11, cellPadding: 8, halign: 'center', lineColor: BRAND.rule },
    headStyles: { fillColor: [245, 247, 250], textColor: BRAND.muted, fontSize: 8, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { textColor: BRAND.ink, fontStyle: 'bold', fontSize: 14 },
  })

  y = doc.lastAutoTable.finalY + 28

  if (passRate != null) {
    doc.setFontSize(9)
    doc.setTextColor(...BRAND.muted)
    doc.setFont('helvetica', 'bold')
    doc.text('COMPLIANCE RATE', margin, y)

    doc.setFontSize(36)
    doc.setTextColor(...BRAND.ink)
    doc.text(`${passRate}%`, margin, y + 40)

    // Progress bar
    const barW = W - margin * 2 - 200
    doc.setFillColor(...BRAND.rule)
    doc.roundedRect(margin + 200, y + 22, barW, 16, 4, 4, 'F')
    doc.setFillColor(...(passRate >= 80 ? [16, 185, 129] : passRate >= 50 ? [245, 158, 11] : BRAND.fire))
    doc.roundedRect(margin + 200, y + 22, (barW * passRate) / 100, 16, 4, 4, 'F')
  }
}

function renderBuildingIndex(doc, { doors, latestByDoor }, { autoTable }) {
  doc.addPage()
  const W = doc.internal.pageSize.getWidth()
  const margin = 36

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.ink)
  doc.text('Door register', margin, 60)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND.muted)
  doc.text(`${doors.length} door${doors.length === 1 ? '' : 's'} on this site`, margin, 78)

  const rows = doors.map(d => {
    const a = latestByDoor.get(d.id)
    const ratingLabel = d.rating === 'custom' ? d.rating_custom : d.rating
    return [
      d.ref,
      d.location || '—',
      d.floor || '—',
      ratingLabel || '—',
      a ? formatDate(a.assessed_at) : '—',
      a ? resultLabel(a.outcome) : 'NOT ASSESSED',
    ]
  })

  autoTable(doc, {
    startY: 100,
    margin: { left: margin, right: margin },
    head: [['Ref', 'Location', 'Floor', 'Rating', 'Last assessed', 'Result']],
    body: rows,
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, lineColor: BRAND.rule, textColor: BRAND.ink },
    headStyles: { fillColor: BRAND.ink, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 252] },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 5) return
      const result = data.row.raw[5]
      if (result === 'PASS') { data.cell.styles.fillColor = BRAND.passBg; data.cell.styles.textColor = BRAND.passInk }
      else if (result === 'FAIL') { data.cell.styles.fillColor = BRAND.failBg; data.cell.styles.textColor = BRAND.failInk }
      else if (result === 'NEEDS INVESTIGATION') { data.cell.styles.fillColor = BRAND.warnBg; data.cell.styles.textColor = BRAND.warnInk }
      data.cell.styles.fontStyle = 'bold'
    },
  })
}

// ─── Footer (page number + generated stamp on every page) ──────────────

function finaliseFooter(doc) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.muted)
    doc.text(
      `AWC Group · Fire Safety   ·   Generated ${formatDate(new Date())}`,
      36, H - 24
    )
    doc.text(`Page ${i} of ${total}`, W - 36, H - 24, { align: 'right' })
    doc.setDrawColor(...BRAND.rule)
    doc.setLineWidth(0.4)
    doc.line(36, H - 36, W - 36, H - 36)
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

async function loadJsPdf() {
  const [jsPdfMod, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return {
    jsPDF: jsPdfMod.default ?? jsPdfMod.jsPDF,
    autoTable: autoTableMod.default ?? autoTableMod.autoTable,
  }
}

function textBlock(doc, label, value, x, y, w) {
  const W = doc.internal.pageSize.getWidth()
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.muted)
  doc.text(label, x, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND.ink)
  const lines = doc.splitTextToSize(value, w)
  doc.text(lines, x, y + 30)
  return y + 30 + lines.length * 12 + 4
}

async function drawSignaturePair(doc, opts) {
  const { x1, x2, y, w, h, leftLabel, leftName, leftSubtext, leftSig, rightLabel, rightName, rightSubtext, rightSig } = opts

  // Left
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.muted)
  doc.text(leftLabel, x1, y + 10)
  doc.setDrawColor(...BRAND.rule)
  doc.setLineWidth(0.6)
  doc.roundedRect(x1, y + 14, w, h, 4, 4)

  await safeDrawSig(doc, leftSig, x1 + 4, y + 18, w - 8, h - 8)

  doc.setTextColor(...BRAND.ink)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(leftName || '—', x1, y + h + 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.muted)
  doc.text(leftSubtext || '', x1, y + h + 40)

  // Right
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.muted)
  doc.text(rightLabel, x2, y + 10)
  doc.setDrawColor(...BRAND.rule)
  doc.roundedRect(x2, y + 14, w, h, 4, 4)

  await safeDrawSig(doc, rightSig, x2 + 4, y + 18, w - 8, h - 8)

  doc.setTextColor(...BRAND.ink)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(rightName || '—', x2, y + h + 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.muted)
  doc.text(rightSubtext || '', x2, y + h + 40)
}

async function safeDrawSig(doc, url, x, y, w, h) {
  if (!url) return
  try {
    const dataUrl = await fetchAsDataURL(url)
    doc.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'FAST')
  } catch {
    /* ignore — leave the signature box empty if fetch fails */
  }
}

async function fetchAsDataURL(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function resultLabel(r) {
  if (r === 'pass') return 'PASS'
  if (r === 'fail') return 'FAIL'
  if (r === 'na') return 'N/A'
  return '—'
}

function urgencyLabel(u) {
  return ({
    immediate: 'Immediate (within 24 hrs)',
    urgent:    'Urgent (within 7 days)',
    routine:   'Routine (within 28 days)',
    none:      'No remedial action needed',
  })[u] ?? u
}

function outcomeStyle(outcome) {
  if (outcome === 'pass')                  return { label: 'PASS',                bg: BRAND.passBg, ink: BRAND.passInk }
  if (outcome === 'fail')                  return { label: 'FAIL',                bg: BRAND.failBg, ink: BRAND.failInk }
  if (outcome === 'needs_investigation')   return { label: 'NEEDS INVESTIGATION', bg: BRAND.warnBg, ink: BRAND.warnInk }
  return { label: 'NOT YET DETERMINED', bg: BRAND.naBg, ink: BRAND.naInk }
}
