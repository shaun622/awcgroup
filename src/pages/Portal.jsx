import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarClock, Briefcase, MapPin, Loader2, FileText, Receipt, CheckCircle2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import DivisionChip from '../components/ui/DivisionChip'
import { supabase } from '../lib/supabase'
import { formatDate, formatDateTime, formatGBP, statusLabel, statusVariant } from '../lib/utils'

/**
 * Portal — the client-facing history page, keyed by premises.portal_token.
 * Publicly accessible. Shows:
 *   • the premises + their services
 *   • visit history (completed jobs + reports)
 *   • any invoices on the client's account
 *
 * No auth or accounts required for MVP; the token URL itself is the credential.
 */
export default function Portal() {
  const { token } = useParams()
  const [state, setState] = useState({ loading: true, premises: null, jobs: [], reports: [], invoices: [], client: null, business: null, photosByReport: {} })
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: premises, error: e1 } = await supabase
          .from('premises')
          .select('*')
          .eq('portal_token', token)
          .maybeSingle()
        if (e1 || !premises) { setError('Link not found'); setState(s => ({ ...s, loading: false })); return }

        const [{ data: client }, { data: business }, { data: jobs }, { data: reports }, { data: invoices }] = await Promise.all([
          supabase.from('clients').select('id,name').eq('id', premises.client_id).maybeSingle(),
          supabase.from('businesses').select('name,phone,email,postcode').eq('id', premises.business_id).maybeSingle(),
          supabase.from('jobs').select('id,title,status,scheduled_date,completed_at,price,division_slug,job_type')
            .eq('premises_id', premises.id)
            .order('scheduled_date', { ascending: false }),
          supabase.from('job_reports').select('*').eq('premises_id', premises.id).order('created_at', { ascending: false }),
          supabase.from('invoices').select('id,invoice_number,total,status,issue_date,due_date,division_slug')
            .eq('client_id', premises.client_id)
            .order('issue_date', { ascending: false }),
        ])

        // Pull photos per report
        const reportIds = (reports ?? []).map(r => r.id)
        const { data: photos } = reportIds.length
          ? await supabase.from('job_photos').select('*').in('job_report_id', reportIds).order('created_at')
          : { data: [] }
        const photosByReport = {}
        ;(photos ?? []).forEach(p => { (photosByReport[p.job_report_id] ||= []).push(p) })

        if (!alive) return
        setState({
          loading: false, premises, client, business,
          jobs: jobs ?? [],
          reports: reports ?? [],
          invoices: invoices ?? [],
          photosByReport,
        })
      } catch (e) {
        if (alive) { setError(e.message); setState(s => ({ ...s, loading: false })) }
      }
    })()
    return () => { alive = false }
  }, [token])

  if (state.loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </main>
    )
  }
  if (error || !state.premises) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 px-4">
        <Card className="max-w-md w-full text-center py-8">
          <p className="text-sm text-gray-500">This portal link isn't valid or has expired.</p>
        </Card>
      </main>
    )
  }

  const { premises, client, business, jobs, reports, invoices, photosByReport } = state

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-3xl mx-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-awc-900 text-white flex items-center justify-center font-bold text-sm">AW</div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{business?.name ?? 'AWC Group'}</p>
            <p className="text-xs text-gray-500">
              {business?.email}{business?.phone ? ` · ${business.phone}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <DivisionChip slug={premises.division_slug} variant="soft" size="sm" />
          <span className="text-xs text-gray-400">Customer portal</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {premises.name ? premises.name : premises.address_line_1}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {client?.name}{premises.postcode ? ` · ${premises.postcode}` : ''}
        </p>

        {/* Next due */}
        {premises.regular_service && premises.next_due_at && (
          <Card className="mb-4 bg-brand-50 dark:bg-brand-950/30 border-brand-100 dark:border-brand-900/50">
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Next scheduled visit</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatDate(premises.next_due_at)} · {statusLabel(premises.service_frequency)} service
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Completed visits */}
        {reports.length > 0 && (
          <section className="mb-6">
            <h2 className="section-title mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Completed visits</h2>
            <div className="space-y-3">
              {reports.map(r => {
                const photos = photosByReport[r.id] ?? []
                const job = jobs.find(j => j.id === r.job_id)
                return (
                  <Card key={r.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{job?.title ?? 'Service visit'}</p>
                        <p className="text-xs text-gray-500">
                          {r.completed_at ? `Completed ${formatDate(r.completed_at)}` : 'In progress'}
                          {r.technician_name ? ` · by ${r.technician_name}` : ''}
                        </p>
                      </div>
                      <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                    </div>
                    {r.notes && <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 whitespace-pre-line">{r.notes}</p>}
                    {photos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {photos.slice(0, 6).map(p => (
                          <img key={p.id} src={p.signed_url} alt={p.tag} loading="lazy"
                            className="w-20 h-20 object-cover rounded-lg bg-gray-100" />
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {jobs.some(j => j.status === 'scheduled' || j.status === 'in_progress') && (
          <section className="mb-6">
            <h2 className="section-title mb-2 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Upcoming</h2>
            <div className="space-y-3">
              {jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').map(j => (
                <Card key={j.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{j.title}</p>
                      <p className="text-xs text-gray-500">
                        {j.scheduled_date ? formatDateTime(j.scheduled_date) : 'Not yet scheduled'}
                        {j.job_type ? ` · ${j.job_type}` : ''}
                      </p>
                    </div>
                    <Badge variant={statusVariant(j.status)}>{statusLabel(j.status)}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <section className="mb-6">
            <h2 className="section-title mb-2 flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Invoices</h2>
            <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}</p>
                  </div>
                  <p className="tabular-nums font-semibold">{formatGBP(inv.total)}</p>
                  <Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                </div>
              ))}
            </Card>
          </section>
        )}

        {reports.length === 0 && jobs.length === 0 && invoices.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-gray-500">Nothing to show here yet — check back after your first visit.</p>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Questions? Reply to the email from {business?.name ?? 'us'}{business?.phone ? `, or call ${business.phone}` : ''}.
        </p>
      </div>
    </main>
  )
}
