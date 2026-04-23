import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import DivisionChip from '../components/ui/DivisionChip'
import Badge from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { formatDate, formatGBP, statusLabel, statusVariant } from '../lib/utils'

/**
 * PublicQuote — the link clients open from the emailed quote.
 * Accessible without auth; uses public_token. Currently reads via anon key
 * (RLS blocks this in prod — a follow-up edge function will vend the row).
 * For MVP we read via a dedicated endpoint once edge functions land.
 */
export default function PublicQuote() {
  const { token } = useParams()
  const [quote, setQuote] = useState(null)
  const [business, setBusiness] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      // TEMPORARY: direct select by public_token. Once RLS is tightened,
      // move this behind a `public-quote` edge function.
      const { data: q, error: e1 } = await supabase
        .from('quotes')
        .select('*')
        .eq('public_token', token)
        .maybeSingle()
      if (!alive) return
      if (e1 || !q) {
        setError('Quote not found')
        setLoading(false)
        return
      }
      setQuote(q)
      // Mark viewed the first time
      if (q.status === 'sent') {
        await supabase.from('quotes').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', q.id)
      }
      const [{ data: biz }, { data: c }] = await Promise.all([
        supabase.from('businesses').select('name,logo_url,phone,email,postcode,city,address_line_1').eq('id', q.business_id).maybeSingle(),
        supabase.from('clients').select('name,email').eq('id', q.client_id).maybeSingle(),
      ])
      if (!alive) return
      setBusiness(biz); setClient(c)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [token])

  const respond = async (accept) => {
    setResponding(true)
    try {
      const next = {
        status: accept ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      }
      await supabase.from('quotes').update(next).eq('id', quote.id)
      setQuote(q => ({ ...q, ...next }))
      toast.success(accept ? 'Quote accepted — we\'ll be in touch.' : 'Quote declined.')
    } catch (e) {
      toast.error('Could not record your response', { description: e.message })
    } finally {
      setResponding(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </main>
    )
  }
  if (error || !quote) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 px-4">
        <Card className="max-w-md w-full text-center py-8">
          <p className="text-sm text-gray-500">This quote link isn't valid or has expired.</p>
        </Card>
      </main>
    )
  }

  const decided = quote.status === 'accepted' || quote.status === 'declined'

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-2xl mx-auto animate-slide-up">
        {/* Company header */}
        <div className="flex items-center gap-3 mb-6">
          {business?.logo_url ? (
            <img src={business.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-awc-900 text-white flex items-center justify-center font-bold text-sm">
              AW
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{business?.name ?? 'AWC Group'}</p>
            {business?.email && (
              <p className="text-xs text-gray-500">{business.email}{business.phone ? ` · ${business.phone}` : ''}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <DivisionChip slug={quote.division_slug} variant="soft" size="sm" />
          <span className="text-xs font-mono text-gray-400">{quote.quote_number}</span>
          <Badge variant={statusVariant(quote.status)}>{statusLabel(quote.status)}</Badge>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
          {quote.subject || 'Quote'}
        </h1>
        {client && <p className="text-sm text-gray-500 mb-5">Prepared for {client.name}</p>}

        {/* Line items */}
        <Card className="!p-0 mb-4">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 grid grid-cols-12 gap-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <span className="col-span-7">Description</span>
            <span className="col-span-2 text-right">Qty</span>
            <span className="col-span-3 text-right">Amount</span>
          </div>
          {quote.line_items.map((l, i) => (
            <div key={i} className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 grid grid-cols-12 gap-3 text-sm">
              <span className="col-span-7 text-gray-900 dark:text-gray-100">{l.description}</span>
              <span className="col-span-2 text-right tabular-nums">{l.qty}</span>
              <span className="col-span-3 text-right tabular-nums font-medium">{formatGBP(l.line_total)}</span>
            </div>
          ))}
          <div className="px-5 py-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="tabular-nums">{formatGBP(quote.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">VAT ({Math.round(Number(quote.vat_rate) * 100)}%)</span><span className="tabular-nums">{formatGBP(quote.vat_amount)}</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-800"><span className="font-bold text-gray-900 dark:text-gray-100">Total</span><span className="tabular-nums text-lg font-bold text-gray-900 dark:text-gray-100">{formatGBP(quote.total)}</span></div>
          </div>
        </Card>

        {quote.scope && (
          <Card className="mb-4">
            <p className="section-title mb-2">Scope</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{quote.scope}</p>
          </Card>
        )}
        {quote.terms && (
          <Card className="mb-4">
            <p className="section-title mb-2">Terms</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{quote.terms}</p>
          </Card>
        )}

        {!decided ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" leftIcon={<XCircle className="w-4 h-4" />} onClick={() => respond(false)} loading={responding} className="flex-1">
              Decline
            </Button>
            <Button leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => respond(true)} loading={responding} className="flex-1">
              Accept quote
            </Button>
          </div>
        ) : (
          <Card className={quote.status === 'accepted' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {quote.status === 'accepted' ? 'Thanks — we\'ve got your acceptance.' : 'Your response has been recorded.'}
            </p>
            {quote.responded_at && (
              <p className="text-xs text-gray-500 mt-0.5">Recorded {formatDate(quote.responded_at)}</p>
            )}
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Questions? Reply to the email that sent you this quote, or call {business?.phone ?? 'us'}.
        </p>
      </div>
    </main>
  )
}
