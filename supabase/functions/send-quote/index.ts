// send-quote — emails a branded quote to the client with the public link.
// Invoked from the QuoteBuilder when the user clicks "Save & mark as sent".
//
// Auth: requires the caller's JWT (invoked via supabase.functions.invoke).
// Uses a server-side Supabase client with the service role key to bypass RLS
// when reading business / client info and updating the sent_at timestamp.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleOptions, json } from '../_shared/cors.ts'
import { divisionBrand, emailStyles as s, formatDate, formatGBP, sendEmail } from '../_shared/email.ts'

Deno.serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre

  try {
    const { quote_id } = await req.json() as { quote_id: string }
    if (!quote_id) return json({ error: 'quote_id required' }, 400)

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: quote, error: qe } = await sb.from('quotes').select('*').eq('id', quote_id).maybeSingle()
    if (qe || !quote) return json({ error: 'quote not found' }, 404)

    const [{ data: biz }, { data: client }] = await Promise.all([
      sb.from('businesses').select('name,email,phone,address_line_1,city,postcode').eq('id', quote.business_id).maybeSingle(),
      sb.from('clients').select('name,email').eq('id', quote.client_id).maybeSingle(),
    ])
    if (!client?.email) return json({ error: 'client has no email' }, 400)

    const brand = divisionBrand(quote.division_slug)
    const publicUrl = `${Deno.env.get('APP_URL') ?? 'https://app.awcgroup.uk'}/quote/${quote.public_token}`

    const lineRows = (quote.line_items ?? []).map((l: any) => `
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
            <p style="${s.small}font-family:ui-monospace,monospace;margin:12px 0 4px 0;">${quote.quote_number}</p>
            <h1 style="${s.h1}">${escapeHtml(quote.subject || 'Your quote')}</h1>
            <p style="${s.p}">Hi ${escapeHtml(client.name ?? 'there')}, here's the quote we put together for you from ${escapeHtml(biz?.name ?? 'AWC Group')}.</p>
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
              <p style="${s.small}text-align:right;margin:4px 0;">Subtotal <strong style="color:#111827;">${formatGBP(quote.subtotal)}</strong></p>
              <p style="${s.small}text-align:right;margin:4px 0;">VAT (${Math.round(Number(quote.vat_rate) * 100)}%) <strong style="color:#111827;">${formatGBP(quote.vat_amount)}</strong></p>
              <p style="${s.small}text-align:right;margin:4px 0;font-size:16px;">Total <strong style="color:#111827;">${formatGBP(quote.total)}</strong></p>
            </div>
            ${quote.scope ? `<hr style="${s.hr}" /><p style="${s.p}"><strong>Scope</strong><br/>${escapeHtml(quote.scope).replace(/\n/g, '<br/>')}</p>` : ''}
            ${quote.terms ? `<p style="${s.p}"><strong>Terms</strong><br/>${escapeHtml(quote.terms).replace(/\n/g, '<br/>')}</p>` : ''}
            ${quote.expires_at ? `<p style="${s.small}">This quote expires on ${formatDate(quote.expires_at)}.</p>` : ''}
            <hr style="${s.hr}" />
            <p style="${s.p}">Review, accept or decline on the secure link below.</p>
            <p><a href="${publicUrl}" style="${s.cta}background:${brand.hex};">Review &amp; respond &rarr;</a></p>
            <p style="${s.small}margin-top:24px;">Questions? Reply to this email or call ${escapeHtml(biz?.phone ?? '')}.</p>
          </div>
          <p style="${s.small}text-align:center;margin-top:16px;">${escapeHtml(biz?.name ?? 'AWC Group')} · ${escapeHtml([biz?.address_line_1, biz?.city, biz?.postcode].filter(Boolean).join(', '))}</p>
        </div>
      </body></html>
    `

    await sendEmail({
      from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@awcgroup.uk',
      to: client.email,
      subject: `${biz?.name ?? 'AWC Group'} — ${quote.subject || quote.quote_number}`,
      html,
      reply_to: biz?.email ?? undefined,
    })

    await sb.from('quotes').update({
      status: quote.status === 'draft' ? 'sent' : quote.status,
      sent_at: quote.sent_at ?? new Date().toISOString(),
    }).eq('id', quote.id)

    await sb.from('activity_feed').insert({
      business_id: quote.business_id,
      division_slug: quote.division_slug,
      event_type: 'quote_sent',
      title: `Quote sent: ${quote.subject || quote.quote_number}`,
      subtitle: `Emailed to ${client.email}`,
      entity_type: 'quote',
      entity_id: quote.id,
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
