import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Sparkles, ArrowRight, Check, Bug, Flame, SprayCan, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'
import { useBusiness } from '../contexts/BusinessContext'
import { supabase } from '../lib/supabase'
import { cn, formatPostcode, validateUKPostcode, formatUKPhone } from '../lib/utils'
import { DIVISIONS, DIVISION_SLUGS } from '../lib/divisionRegistry'

const DIVISION_ICONS = { pest: Bug, fire: Flame, hygiene: SprayCan, locksmith: KeyRound }

export default function Onboarding() {
  const { user } = useAuth()
  const { refetch } = useBusiness()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: 'A Wilkinson Company Ltd',
    trading_name: '',
    companies_house_number: '',
    vat_number: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postcode: '',
    phone: '',
    email: user?.email ?? '',
  })
  const [enabled, setEnabled] = useState(['pest', 'fire'])
  const [errors, setErrors] = useState({})

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleDivision = (slug) => {
    setEnabled(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  const validateStep1 = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (form.postcode && !validateUKPostcode(form.postcode)) e.postcode = 'Invalid UK postcode'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (step === 1 && !validateStep1()) return
    setStep(s => s + 1)
  }

  const submit = async () => {
    if (enabled.length === 0) {
      toast.error('Pick at least one division')
      return
    }
    setSaving(true)
    try {
      // 1. Create business
      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: form.name.trim(),
          trading_name: form.trading_name || null,
          companies_house_number: form.companies_house_number || null,
          vat_number: form.vat_number || null,
          address_line_1: form.address_line_1 || null,
          address_line_2: form.address_line_2 || null,
          city: form.city || null,
          postcode: form.postcode ? formatPostcode(form.postcode) : null,
          phone: form.phone || null,
          email: form.email || null,
          enabled_divisions: enabled,
        })
        .select()
        .single()

      if (bizErr) throw bizErr

      // 2. Seed templates (job types + products) per enabled division
      //    Uses the seed_division_templates() RPC installed by migration 003.
      for (const slug of enabled) {
        const { error: seedErr } = await supabase.rpc('seed_division_templates', {
          _business_id: biz.id,
          _division: slug,
        })
        if (seedErr) console.warn(`seed ${slug}:`, seedErr.message)
      }

      // 3. Create an owner staff_members row so the user is also considered staff
      await supabase.from('staff_members').insert({
        business_id: biz.id,
        auth_user_id: user.id,
        name: user.user_metadata?.full_name ?? user.email,
        email: user.email,
        role: 'owner',
        divisions: enabled,
      })

      toast.success(`Welcome to ${biz.name}`, { description: 'You can change divisions and settings any time.' })
      await refetch()
      navigate('/', { replace: true })
    } catch (e) {
      console.error(e)
      toast.error('Could not finish setup', { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-page dark:bg-gray-950">
      <div className="w-full max-w-xl animate-slide-up">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-awc-900 text-white flex items-center justify-center font-bold text-lg tracking-tight shadow-soft-lift mb-4">AW</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Let's get you set up</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            A couple of quick steps to create your AWC workspace. You can change anything later in Settings.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map(n => (
            <div
              key={n}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                n === step ? 'w-10 bg-brand-500' : n < step ? 'w-6 bg-brand-500' : 'w-6 bg-gray-200 dark:bg-gray-700'
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <Card className="p-6 space-y-4 shadow-soft-lift">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-500" /> Business details
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">The basics — you can polish later.</p>
            </div>

            <Input label="Business name" value={form.name} onChange={e => update('name', e.target.value)} error={errors.name} required />
            <Input label="Trading name (optional)" value={form.trading_name} onChange={e => update('trading_name', e.target.value)} placeholder="If different from registered name" />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Companies House no." value={form.companies_house_number} onChange={e => update('companies_house_number', e.target.value)} placeholder="12345678" />
              <Input label="VAT number" value={form.vat_number} onChange={e => update('vat_number', e.target.value)} placeholder="GB123456789" />
            </div>

            <Input label="Address line 1" value={form.address_line_1} onChange={e => update('address_line_1', e.target.value)} />
            <Input label="Address line 2" value={form.address_line_2} onChange={e => update('address_line_2', e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
              <Input
                label="Postcode"
                value={form.postcode}
                onChange={e => update('postcode', e.target.value)}
                onBlur={e => update('postcode', formatPostcode(e.target.value))}
                error={errors.postcode}
                placeholder="SW1A 1AA"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                onBlur={e => update('phone', formatUKPhone(e.target.value))}
                placeholder="07123 456789"
              />
              <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
            </div>

            <div className="pt-2">
              <Button type="button" onClick={next} className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-5 shadow-soft-lift">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-500" /> Pick your divisions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Which services do you run today? Add or remove any time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DIVISION_SLUGS.map(slug => {
                const div = DIVISIONS[slug]
                const Icon = DIVISION_ICONS[slug]
                const active = enabled.includes(slug)
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleDivision(slug)}
                    className={cn(
                      'relative group rounded-2xl border-2 p-4 text-left transition-all min-h-[120px]',
                      active
                        ? 'shadow-card'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
                    )}
                    style={active ? {
                      borderColor: div.brand_hex,
                      backgroundColor: `${div.brand_hex}0d`, // 5% tint
                      boxShadow: `0 0 0 1px ${div.brand_hex}33, 0 4px 14px -6px ${div.brand_hex}40`,
                    } : {}}
                  >
                    {active && (
                      <span
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: div.brand_hex }}
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors',
                        active ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                      )}
                      style={active ? { backgroundColor: div.brand_hex } : {}}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{div.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{div.tagline}</p>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={submit} loading={saving} className="flex-1">Create workspace</Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
