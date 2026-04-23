import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'

/**
 * useStaff — load active staff for the current business, optionally filtered
 * to those who work in the given division (used by the job assignment picker).
 */
export function useStaff({ divisionSlug } = {}) {
  const { business } = useBusiness()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business) { setStaff([]); setLoading(false); return }
    let alive = true
    setLoading(true)
    supabase
      .from('staff_members')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (!alive) return
        let list = data ?? []
        if (divisionSlug) {
          // Owners/admins have empty divisions array and are considered multi-division;
          // techs are filtered to those explicitly tagged.
          list = list.filter(s => s.role !== 'tech' || (s.divisions ?? []).includes(divisionSlug))
        }
        setStaff(list)
        setLoading(false)
      })
    return () => { alive = false }
  }, [business, divisionSlug])

  return { staff, loading }
}
