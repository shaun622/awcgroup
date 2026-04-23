import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Search } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/Skeleton'
import DivisionChip from '../../components/ui/DivisionChip'
import { useBusiness } from '../../contexts/BusinessContext'
import { useDivision } from '../../contexts/DivisionContext'
import { supabase } from '../../lib/supabase'
import { cn, formatGBP, statusLabel } from '../../lib/utils'

export default function ProductsLibrary() {
  const navigate = useNavigate()
  const { business } = useBusiness()
  const { currentDivision, available, isGroupView } = useDivision()
  const [selectedSlug, setSelectedSlug] = useState(currentDivision?.slug ?? available[0]?.slug)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isGroupView) setSelectedSlug(available[0]?.slug)
    else setSelectedSlug(currentDivision?.slug)
  }, [isGroupView, currentDivision, available])

  useEffect(() => {
    if (!business || !selectedSlug) return
    setLoading(true)
    supabase
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .eq('division_slug', selectedSlug)
      .order('category')
      .order('name')
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [business, selectedSlug])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q)
    )
  }, [products, search])

  const byCategory = useMemo(() => {
    const m = new Map()
    filtered.forEach(p => {
      const key = p.category || 'Uncategorised'
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(p)
    })
    return Array.from(m.entries())
  }, [filtered])

  return (
    <PageWrapper size="xl">
      <button
        onClick={() => navigate('/settings')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 -ml-1 min-h-tap px-1"
      >
        <ArrowLeft className="w-4 h-4" /> Settings
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">Products &amp; equipment</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Per-division library — used when logging what was consumed on a job.</p>

      {/* Division picker */}
      <div className="mb-4 flex flex-wrap gap-2">
        {available.map(div => {
          const active = selectedSlug === div.slug
          return (
            <button
              key={div.slug}
              type="button"
              onClick={() => setSelectedSlug(div.slug)}
              className={cn(
                'rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all min-h-[40px] flex items-center gap-1.5',
                active ? '' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300',
              )}
              style={active ? { borderColor: div.brand_hex, backgroundColor: `${div.brand_hex}15`, color: div.brand_hex } : {}}
            >
              <div.icon className="w-4 h-4" strokeWidth={2.2} />
              {div.name}
            </button>
          )
        })}
      </div>

      <Input
        leftAdornment={<Search className="w-4 h-4" />}
        placeholder="Search products…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="!pl-10 mb-4"
      />

      {loading ? (
        <SkeletonList count={3} />
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description={`No items in the ${statusLabel(selectedSlug)} library yet.`} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500">No matches for "{search}"</div>
      ) : (
        <div className="space-y-6">
          {byCategory.map(([category, items]) => (
            <div key={category}>
              <h3 className="section-title mb-2">{statusLabel(category)} ({items.length})</h3>
              <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
                {items.map(p => (
                  <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                      {p.notes && <p className="text-xs text-gray-500 mt-0.5">{p.notes}</p>}
                      {p.hse_approval && <p className="text-[11px] text-gray-400 mt-0.5">HSE {p.hse_approval}</p>}
                    </div>
                    <div className="text-right shrink-0 text-sm">
                      {p.unit_price != null && <p className="tabular-nums font-semibold">{formatGBP(p.unit_price)}</p>}
                      {p.unit_cost != null && p.unit_price == null && <p className="tabular-nums text-gray-500">cost {formatGBP(p.unit_cost)}</p>}
                      {p.hourly_rate && <p className="text-[11px] text-gray-400">{formatGBP(p.hourly_rate)}/hr</p>}
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">per {p.unit}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
