// Thin Resend wrapper. Edge functions import this rather than the Resend SDK
// so we avoid an extra dependency and keep bundle size minimal.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export async function sendEmail(opts: {
  from: string
  to: string | string[]
  subject: string
  html: string
  reply_to?: string
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.reply_to,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
  return res.json()
}

/** Shared inline styles for email HTML. Inline-only because email clients. */
export const emailStyles = {
  body:   'margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111827;',
  wrap:   'max-width:600px;margin:32px auto;padding:0 16px;',
  card:   'background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;',
  h1:     'font-size:22px;font-weight:700;color:#111827;margin:0 0 4px 0;',
  p:      'font-size:14px;line-height:1.55;color:#374151;margin:8px 0;',
  small:  'font-size:12px;color:#6b7280;',
  chip:   'display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;',
  hr:     'border:0;border-top:1px solid #e5e7eb;margin:16px 0;',
  cta:    'display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600;font-size:14px;',
  table:  'width:100%;border-collapse:collapse;',
  th:     'text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;padding:8px 0;border-bottom:1px solid #e5e7eb;',
  td:     'padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;vertical-align:top;',
}

export function formatGBP(amount: number | string | null | undefined): string {
  if (amount == null) return '£0.00'
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(n)) return '£0.00'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/** Division → brand hex for email headers */
export function divisionBrand(slug: string): { name: string; hex: string } {
  switch (slug) {
    case 'pest':      return { name: 'Pest Control',     hex: '#16a34a' }
    case 'fire':      return { name: 'Fire Safety',      hex: '#dc2626' }
    case 'hygiene':   return { name: 'Hygiene Services', hex: '#0891b2' }
    case 'locksmith': return { name: 'Locksmith',        hex: '#d97706' }
    default:          return { name: 'AWC Group',        hex: '#1e2836' }
  }
}
