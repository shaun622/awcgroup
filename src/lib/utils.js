import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { enGB } from 'date-fns/locale'

export function cn(...args) {
  return twMerge(clsx(args))
}

/* ── Dates (UK) ───────────────────────────────────────────── */
const toDate = (d) => (typeof d === 'string' ? parseISO(d) : d)

export function formatDate(d) {
  if (!d) return ''
  return format(toDate(d), 'd MMM yyyy', { locale: enGB })
}
export function formatDateShort(d) {
  if (!d) return ''
  return format(toDate(d), 'dd/MM/yyyy', { locale: enGB })
}
export function formatDateTime(d) {
  if (!d) return ''
  return format(toDate(d), 'd MMM yyyy, HH:mm', { locale: enGB })
}
export function formatTime(d) {
  if (!d) return ''
  return format(toDate(d), 'HH:mm', { locale: enGB })
}
export function formatRelative(d) {
  if (!d) return ''
  return formatDistanceToNow(toDate(d), { addSuffix: true, locale: enGB })
}

/* ── Money (GBP) ──────────────────────────────────────────── */
const gbpFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatGBP(amount) {
  if (amount == null || isNaN(amount)) return '£0.00'
  return gbpFormatter.format(Number(amount))
}

export function calculateVAT(subtotal, rate = 0.20) {
  const s = Number(subtotal) || 0
  const vat = +(s * rate).toFixed(2)
  return { subtotal: s, vatAmount: vat, total: +(s + vat).toFixed(2) }
}

/* ── UK formats ───────────────────────────────────────────── */
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i

export function validateUKPostcode(pc) {
  if (!pc) return false
  return UK_POSTCODE_RE.test(pc.trim())
}

export function formatPostcode(pc) {
  if (!pc) return ''
  const clean = pc.replace(/\s+/g, '').toUpperCase()
  if (clean.length < 5) return clean
  return clean.slice(0, -3) + ' ' + clean.slice(-3)
}

export function formatUKPhone(num) {
  if (!num) return ''
  const digits = num.replace(/\D/g, '')
  if (digits.startsWith('44')) {
    const rest = digits.slice(2)
    if (rest.length >= 10) return `+44 ${rest.slice(0, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`
  }
  if (digits.startsWith('07') && digits.length === 11) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return num
}

/* ── Status helpers ───────────────────────────────────────── */
const STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  follow_up: 'Follow up',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  lead: 'Lead',
  quoted: 'Quoted',
  active: 'Active',
  lost: 'Lost',
}

export function statusLabel(s) {
  return STATUS_LABELS[s] ?? (s ? s.replace(/_/g, ' ') : '')
}

export function statusVariant(s) {
  switch (s) {
    case 'completed':
    case 'accepted':
    case 'active':
      return 'success'
    case 'in_progress':
    case 'sent':
    case 'viewed':
    case 'quoted':
      return 'primary'
    case 'on_hold':
    case 'follow_up':
      return 'warning'
    case 'cancelled':
    case 'declined':
    case 'expired':
    case 'lost':
      return 'danger'
    default:
      return 'default'
  }
}

/* ── Constants ────────────────────────────────────────────── */
export const CLIENT_TYPES = ['residential', 'commercial', 'public_sector', 'housing_association', 'industrial']
export const SERVICE_FREQUENCIES = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'biannual', 'annual']
export const JOB_STATUSES = ['scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled']
export const QUOTE_STATUSES = ['draft', 'sent', 'viewed', 'follow_up', 'accepted', 'declined', 'expired']

/* ── Misc ─────────────────────────────────────────────────── */
export function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}
