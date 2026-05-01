// send-invoice — emails a branded invoice to the client with the
// portal link to the parent premises (so they can see context). Mirrors
// the send-quote pattern: server-side service-role client, branded HTML
// per division, Resend-backed delivery, idempotent status update.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, json } from '../_shared/cors.ts'
import { divisionBrand, emailStyles as s, formatDate, formatGBP, sendEmail } from '../_shared/email.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre

  try {
    const { invoice_id } = await req.json() as { invoice_id: string }
    if (!invoice_id) return json({ error: 'invoice_id required' }, 400)

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: invoice, error: ie } = await sb.from('invoices').select('*').eq('id', invoice_id).maybeSingle()
    if (ie || !invoice) return json({ error: 'invoice not found' }, 404)

    const [{ data: biz }, { data: client }] = await Promise.all([
      sb.from('businesses').select('name,email,phone,address_line_1,city,postcode').eq('id', invoice.business_id).maybeSingle(),
      sb.from('clients').select('name,email').eq('id', invoice.client_id).maybeSingle(),
    ])
    if (!client?.email) return json({ error: 'client has no email' }, 400)

    // For invoices we don't have a per-invoice public token (yet), so the
    // CTA points at the customer portal of the parent premises. If the
    // invoice isn't linked to a premises, fall back to the business
    // homepage — the email body still has all the line-item detail so
    // the customer can act on it without clicking through.
    let portalToken: string | null = null
    if (invoice.job_id) {
      const { data: job } = await sb.from('jobs').select('premises_id').eq('id', invoice.job_id).maybeSingle()
      if (job?.premises_id) {
        const { data: prem } = await sb.from('premises').select('portal_token').eq('id', job.premises_id).maybeSingle()
        portalToken = prem?.portal_token ?? null
      }
    }
    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.awcgroup.uk'
    const portalUrl = portalToken ? `${appUrl}/portal/${portalToken}` : null

    const brand = divisionBrand(invoice.division_slug)

    const lineRows = (invoice.line_items ?? []).map((l: any) => `
      <tr>
        <td style="${s.td}">${escapeHtml(l.description ?? '')}</td>
        <td style="${s.td}text-align:right;">${Number(l.qty ?? 0)}</td>
        <td style="${s.td}text-align:right;">${formatGBP(l.line_total ?? 0)}</td>
      </tr>
    `).join('')

    const html = `
      <!doctype html>
      <html><body style="${s.body}">
        <div style="${s.wrap}">
          <div style="${s.card}">
            <div style="${s.chip}background:${brand.hex}15;color:${brand.hex};">${brand.name}</div>
            <p style="${s.small}font-family:ui-monospace,monospace;margin:12px 0 4px 0;">${invoice.invoice_number}</p>
            <h1 style="${s.h1}">Invoice for ${escapeHtml(client.name ?? 'you')}</h1>
            <p style="${s.p}">Hi ${escapeHtml(client.name ?? 'there')}, please find your invoice from ${escapeHtml(biz?.name ?? 'AWC Group')} below. Payment is due by <strong>${formatDate(invoice.due_date)}</strong>.</p>
            <hr style="${s.hr}" />
            <table style="${s.table}">
              <thead>
                <tr>
                  <th style="${s.th}">Description</th>
                  <th style="${s.th}text-align:right;">Qty</th>
                  <th style="${s.th}text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${lineRows}</tbody>
            </table>
            <div style="margin-top:16px;">
              <p style="${s.small}text-align:right;margin:4px 0;">Subtotal <strong style="color:#111827;">${formatGBP(invoice.subtotal)}</strong></p>
              <p style="${s.small}text-align:right;margin:4px 0;">VAT (${Math.round(Number(invoice.vat_rate) * 100)}%) <strong style="color:#111827;">${formatGBP(invoice.vat_amount)}</strong></p>
              <p style="${s.small}text-align:right;margin:4px 0;font-size:18px;">Total due <strong style="color:#111827;">${formatGBP(invoice.total)}</strong></p>
            </div>
            ${invoice.notes ? `<hr style="${s.hr}" /><p style="${s.p}"><strong>Notes</strong><br/>${escapeHtml(invoice.notes).replace(/\n/g, '<br/>')}</p>` : ''}
            <hr style="${s.hr}" />
            <p style="${s.small}"><strong>Issued:</strong> ${formatDate(invoice.issue_date)} &nbsp;·&nbsp; <strong>Due:</strong> ${formatDate(invoice.due_date)}${invoice.payment_terms_days ? ` (${invoice.payment_terms_days} days)` : ''}</p>
            ${portalUrl ? `<p><a href="${portalUrl}" style="${s.cta}background:${brand.hex};">View service history &amp; invoices &rarr;</a></p>` : ''}
            <p style="${s.small}margin-top:24px;">Questions? Reply to this email or call ${escapeHtml(biz?.phone ?? '')}.</p>
          </div>
          <p style="${s.small}text-align:center;margin-top:16px;">${escapeHtml(biz?.name ?? 'AWC Group')} · ${escapeHtml([biz?.address_line_1, biz?.city, biz?.postcode].filter(Boolean).join(', '))}</p>
        </div>
      </body></html>
    `

    await sendEmail({
      from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@awcgroup.uk',
      to: client.email,
      subject: `${biz?.name ?? 'AWC Group'} — Invoice ${invoice.invoice_number} (${formatGBP(invoice.total)})`,
      html,
      reply_to: biz?.email ?? undefined,
    })

    // Idempotent status flip: only move draft → sent on first send. If
    // the customer is being re-sent a copy (sent → sent or sent → viewed)
    // we leave the status alone but always refresh sent_at.
    const newStatus = invoice.status === 'draft' ? 'sent' : invoice.status
    await sb.from('invoices').update({
      status: newStatus,
      sent_at: invoice.sent_at ?? new Date().toISOString(),
    }).eq('id', invoice.id)

    await sb.from('activity_feed').insert({
      business_id: invoice.business_id,
      division_slug: invoice.division_slug,
      event_type: 'invoice_sent',
      title: `Invoice sent: ${invoice.invoice_number}`,
      subtitle: `${formatGBP(invoice.total)} — emailed to ${client.email}`,
      entity_type: 'invoice',
      entity_id: invoice.id,
    })

    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
