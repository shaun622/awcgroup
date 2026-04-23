import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { useBusiness } from '../../contexts/BusinessContext'
import { supabase } from '../../lib/supabase'
import { DIVISION_SLUGS, getDivision } from '../../lib/divisionRegistry'
import { cn } from '../../lib/utils'

export default function DivisionsSettings() {
  const navigate = useNavigate()
  const { business, refetch } = useBusiness()
  const [saving, setSaving] = useState(false)
  const current = new Set(business?.enabled_divisions ?? [])

  const toggle = async (slug) => {
    if (!business) return
    const next = new Set(current)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)

    if (next.size === 0) {
      toast.error('You must keep at least one division enabled')
      return
    }

    setSaving(true)
    try {
      await supabase.from('businesses').update({ enabled_divisions: Array.from(next) }).eq('id', business.id)
      // If we enabled a new division, seed its templates
      if (!current.has(slug) && next.has(slug)) {
        const { error } = await supabase.rpc('seed_division_templates', {
          _business_id: business.id,
          _division: slug,
        })
        if (error) console.warn('seed error:', error.message)
      }
      await refetch()
      toast.success(`${getDivision(slug).name} ${next.has(slug) ? 'enabled' : 'disabled'}`)
    } catch (err) {
      toast.error('Could not update', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate('/settings')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Settings
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">Divisions</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Toggle a division to activate or hide it. Enabling seeds job type and product templates automatically.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {DIVISION_SLUGS.map(slug => {
          const div = getDivision(slug)
          const enabled = current.has(slug)
          return (
            <button
              key={slug}
              type="button"
              onClick={() => toggle(slug)}
              disabled={saving}
              className={cn(
                'relative rounded-2xl border-2 p-5 text-left transition-all disabled:opacity-60',
                enabled ? 'shadow-card' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400',
              )}
              style={enabled ? {
                borderColor: div.brand_hex,
                backgroundColor: `${div.brand_hex}10`,
              } : {}}
            >
              {enabled && (
                <span className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: div.brand_hex }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              )}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors"
                style={{ backgroundColor: enabled ? div.brand_hex : 'transparent', color: enabled ? 'white' : undefined }}
              >
                <div.icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{div.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{div.tagline}</p>
              <p className="mt-3 text-[11px] text-gray-500">
                {enabled ? 'Visible in the division switcher.' : 'Hidden — enable to start tracking this division.'}
              </p>
            </button>
          )
        })}
      </div>
    </PageWrapper>
  )
}
