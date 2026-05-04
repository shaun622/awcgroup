import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useBusiness } from '../../contexts/BusinessContext'
import { supabase } from '../../lib/supabase'
import { formatPostcode, formatUKPhone, validateUKPostcode } from '../../lib/utils'

// Renders inside the Settings shell's right pane (see ../Settings.jsx).
// No PageWrapper / back-link / outer h1 — the shell handles all of that.
export default function BusinessSettings() {
  const { business, refetch } = useBusiness()
  const [form, setForm] = useState({
    name: '', trading_name: '', companies_house_number: '', vat_number: '',
    address_line_1: '', address_line_2: '', city: '', county: '', postcode: '',
    phone: '', email: '',
    invoice_prefix: 'INV', default_payment_terms_days: 14,
    // VAT stored as decimal (0.20 = 20%) but edited as percent so the
    // operator types "20" instead of "0.20". Save converts back.
    vat_rate_percent: 20,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!business) return
    setForm({
      name: business.name ?? '',
      trading_name: business.trading_name ?? '',
      companies_house_number: business.companies_house_number ?? '',
      vat_number: business.vat_number ?? '',
      address_line_1: business.address_line_1 ?? '',
      address_line_2: business.address_line_2 ?? '',
      city: business.city ?? '',
      county: business.county ?? '',
      postcode: business.postcode ?? '',
      phone: business.phone ?? '',
      email: business.email ?? '',
      invoice_prefix: business.invoice_prefix ?? 'INV',
      default_payment_terms_days: business.default_payment_terms_days ?? 14,
      // numeric(5,4) arrives from PostgREST as a string ("0.2000") so coerce.
      vat_rate_percent: business.vat_rate != null ? Number(business.vat_rate) * 100 : 20,
    })
  }, [business?.id])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (form.postcode && !validateUKPostcode(form.postcode)) errs.postcode = 'Invalid UK postcode'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const { error } = await supabase.from('businesses').update({
        name: form.name.trim(),
        trading_name: form.trading_name || null,
        companies_house_number: form.companies_house_number || null,
        vat_number: form.vat_number || null,
        address_line_1: form.address_line_1 || null,
        address_line_2: form.address_line_2 || null,
        city: form.city || null,
        county: form.county || null,
        postcode: form.postcode ? formatPostcode(form.postcode) : null,
        phone: form.phone || null,
        email: form.email || null,
        invoice_prefix: form.invoice_prefix?.trim().toUpperCase() || 'INV',
        default_payment_terms_days: Number(form.default_payment_terms_days) || 14,
        // Clamp to [0, 1] so a typo like "200" can't write a 2.0 rate.
        vat_rate: Math.max(0, Math.min(1, (Number(form.vat_rate_percent) || 20) / 100)),
      }).eq('id', business.id)
      if (error) throw error
      await refetch()
      toast.success('Saved')
    } catch (err) {
      toast.error('Could not save', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">These appear on quotes and invoices.</p>

      <Card className="space-y-4 mb-6">
        <Input label="Business name" required value={form.name} onChange={e => update('name', e.target.value)} error={errors.name} />
        <Input label="Trading name (optional)" value={form.trading_name} onChange={e => update('trading_name', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Companies House no." value={form.companies_house_number} onChange={e => update('companies_house_number', e.target.value)} />
          <Input label="VAT number" value={form.vat_number} onChange={e => update('vat_number', e.target.value)} />
        </div>
      </Card>

      <h2 className="section-title mb-2">Registered address</h2>
      <Card className="space-y-4 mb-6">
        <Input label="Address line 1" value={form.address_line_1} onChange={e => update('address_line_1', e.target.value)} />
        <Input label="Address line 2" value={form.address_line_2} onChange={e => update('address_line_2', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
          <Input label="County" value={form.county} onChange={e => update('county', e.target.value)} />
        </div>
        <Input label="Postcode" value={form.postcode} onChange={e => update('postcode', e.target.value)} onBlur={e => update('postcode', formatPostcode(e.target.value))} error={errors.postcode} placeholder="SW1A 1AA" />
      </Card>

      <h2 className="section-title mb-2">Contact</h2>
      <Card className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} onBlur={e => update('phone', formatUKPhone(e.target.value))} />
          <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
        </div>
      </Card>

      <h2 className="section-title mb-2">Invoicing</h2>
      <Card className="space-y-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <Input label="Invoice prefix" value={form.invoice_prefix} onChange={e => update('invoice_prefix', e.target.value)} hint="Appears before the year + number, e.g. INV-2026-0001" />
          <Input label="VAT rate (%)" type="number" min="0" max="100" step="0.1" value={form.vat_rate_percent} onChange={e => update('vat_rate_percent', e.target.value)} placeholder="20" />
          <Input label="Default payment terms (days)" type="number" min="0" value={form.default_payment_terms_days} onChange={e => update('default_payment_terms_days', e.target.value)} />
        </div>
      </Card>

      <div className="flex">
        <Button onClick={save} loading={saving} leftIcon={<Save className="w-4 h-4" />} className="ml-auto">
          Save business details
        </Button>
      </div>
    </div>
  )
}
