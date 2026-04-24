import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'

/**
 * useJobTypeTemplates — load + create job type templates for the given division.
 * Returns [] when divisionSlug is falsy.
 */
export function useJobTypeTemplates(divisionSlug) {
  const { business } = useBusiness()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!business || !divisionSlug) { setTemplates([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('job_type_templates')
      .select('*')
      .eq('business_id', business.id)
      .eq('division_slug', divisionSlug)
      .order('name')
    setTemplates(data ?? [])
    setLoading(false)
  }, [business, divisionSlug])

  useEffect(() => { refetch() }, [refetch])

  const createTemplate = useCallback(async (payload) => {
    if (!business || !divisionSlug) throw new Error('business + divisionSlug required')
    const row = {
      business_id: business.id,
      division_slug: divisionSlug,
      name: payload.name?.trim(),
      description: payload.description?.trim() || null,
      default_tasks: payload.default_tasks ?? [],
      estimated_duration_minutes: payload.estimated_duration_minutes ?? null,
      default_price: payload.default_price ?? null,
      colour: payload.colour ?? null,
    }
    const { data, error } = await supabase.from('job_type_templates').insert(row).select().single()
    if (error) throw error
    setTemplates(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }, [business, divisionSlug])

  return { templates, loading, refetch, createTemplate }
}
