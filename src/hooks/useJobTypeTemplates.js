import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'

/**
 * useJobTypeTemplates — load job type templates for the given division.
 * Division is required; returns [] otherwise.
 */
export function useJobTypeTemplates(divisionSlug) {
  const { business } = useBusiness()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business || !divisionSlug) { setTemplates([]); setLoading(false); return }
    let alive = true
    setLoading(true)
    supabase
      .from('job_type_templates')
      .select('*')
      .eq('business_id', business.id)
      .eq('division_slug', divisionSlug)
      .order('name')
      .then(({ data }) => {
        if (alive) { setTemplates(data ?? []); setLoading(false) }
      })
    return () => { alive = false }
  }, [business, divisionSlug])

  return { templates, loading }
}
