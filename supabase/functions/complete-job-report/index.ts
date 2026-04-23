// complete-job-report — emails a completed job report to the client and
// the business owner, and drops an activity_feed entry. Invoked from
// NewJobReport.jsx when the tech submits the report.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleOptions, json } from '../_shared/cors.ts'
import { divisionBrand, emailStyles as s, formatDate, sendEmail } from '../_shared/email.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre

  try {
    const { job_report_id } = await req.json() as { job_report_id: string }
    if (!job_report_id) return json({ error: 'job_report_id required' }, 400)

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: report } = await sb.from('job_reports').select('*').eq('id', job_report_id).maybeSingle()
    if (!report) return json({ error: 'report not found' }, 404)

    const [{ data: job }, { data: biz }, { data: tasks }, { data: photos }] = await Promise.all([
      sb.from('jobs').select('*').eq('id', report.job_id).maybeSingle(),
      sb.from('businesses').select('name,email,phone').eq('id', report.business_id).maybeSingle(),
      sb.from('job_tasks').select('task_name,completed').eq('job_report_id', report.id).order('sort_order'),
      sb.from('job_photos').select('signed_url,tag').eq('job_report_id', report.id).limit(8),
    ])

    const [{ data: client }, { data: premises }] = await Promise.all([
      job ? sb.from('clients').select('name,email').eq('id', job.client_id).maybeSingle() : Promise.resolve({ data: null }),
      job?.premises_id ? sb.from('premises').select('name,address_line_1,postcode').eq('id', job.premises_id).maybeSingle() : Promise.resolve({ data: null }),
    ])

    const brand = divisionBrand(report.division_slug)

    const taskRows = (tasks ?? []).map((t: any) => `
      <li style="${s.p}margin:4px 0;color:#111827;">${t.completed ? '✓' : '○'} ${escapeHtml(t.task_name)}</li>
    `).join('')

    const reportDataRows = Object.entries(report.report_data ?? {}).map(([k, v]) => `
      <tr>
        <td style="${s.td}color:#6b7280;text-transform:capitalize;">${escapeHtml(k.replace(/_/g, ' '))}</td>
        <td style="${s.td}text-align:right;">${formatValue(v)}</td>
      </tr>
    `).join('')

    const photoImgs = (photos ?? []).map((p: any) => `
      <img src="${p.signed_url}" alt="${p.tag}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;margin:4px;" />
    `).join('')

    const html = `
      <!doctype html>
      <html><body style="${s.body}">
        <div style="${s.wrap}">
          <div style="${s.card}">
            <div style="${s.chip}background:${brand.hex}15;color:${brand.hex};">${brand.name}</div>
            <h1 style="${s.h1}margin-top:12px;">${escapeHtml(job?.title ?? 'Visit report')}</h1>
            <p style="${s.small}">${premises ? escapeHtml([premises.name, premises.address_line_1, premises.postcode].filter(Boolean).join(' · ')) : ''}</p>
            <p style="${s.small}">Completed ${formatDate(report.completed_at)}${report.technician_name ? ` by ${escapeHtml(report.technician_name)}` : ''}.</p>
            <hr style="${s.hr}" />

            ${taskRows ? `<h3 style="font-size:14px;margin:16px 0 6px 0;color:#111827;">Tasks completed</h3><ul style="margin:0;padding-left:18px;">${taskRows}</ul>` : ''}

            ${reportDataRows ? `
              <h3 style="font-size:14px;margin:16px 0 6px 0;color:#111827;">Findings</h3>
              <table style="${s.table}">${reportDataRows}</table>
            ` : ''}

            ${report.notes ? `<h3 style="font-size:14px;margin:16px 0 6px 0;color:#111827;">Notes</h3><p style="${s.p}">${escapeHtml(report.notes).replace(/\n/g, '<br/>')}</p>` : ''}

            ${photoImgs ? `<h3 style="font-size:14px;margin:16px 0 6px 0;color:#111827;">Photos</h3><div style="margin:0 -4px;">${photoImgs}</div>` : ''}

            <hr style="${s.hr}" />
            <p style="${s.small}">Any questions? Reply to this email or call ${escapeHtml(biz?.phone ?? '')}.</p>
          </div>
          <p style="${s.small}text-align:center;margin-top:16px;">${escapeHtml(biz?.name ?? 'AWC Group')}</p>
        </div>
      </body></html>
    `

    const recipients: string[] = []
    if (client?.email) recipients.push(client.email)
    if (biz?.email && biz.email !== client?.email) recipients.push(biz.email)

    if (recipients.length > 0) {
      await sendEmail({
        from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@awcgroup.co.uk',
        to: recipients,
        subject: `${biz?.name ?? 'AWC Group'} — ${brand.name} visit completed`,
        html,
        reply_to: biz?.email ?? undefined,
      })
    }

    await sb.from('job_reports').update({
      report_sent_at: new Date().toISOString(),
    }).eq('id', report.id)

    await sb.from('activity_feed').insert({
      business_id: report.business_id,
      division_slug: report.division_slug,
      event_type: 'report_completed',
      title: `Report sent: ${job?.title ?? 'Visit'}`,
      subtitle: client?.email ? `Emailed to ${client.email}` : 'No client email on file',
      entity_type: 'job_report',
      entity_id: report.id,
    })

    return json({ ok: true, recipients: recipients.length })
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})

function formatValue(v: unknown): string {
  if (v === true) return '✓ Yes'
  if (v === false) return '—'
  if (Array.isArray(v)) return v.map(String).join(', ')
  if (typeof v === 'object' && v !== null) return JSON.stringify(v)
  return String(v ?? '')
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
