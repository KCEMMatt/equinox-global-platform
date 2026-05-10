'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, ExternalLink, Filter, Plus, Radar, Search, Sparkles, Target } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { m2, money, scoreLabel, shortMoney, type Listing } from '@/lib/mock-data'
import { fetchProperties, insertProperty } from '@/lib/properties'
import {
  defaultCategories,
  defaultSourceSearches,
  fetchSourceSearches,
  getBestMatch,
  getCategoryMatches,
  getMockImportedListings,
  insertSourceSearch,
  scoreAgainstCategory,
  type SourceSearch,
} from '@/lib/acquisition-engine'

export default function AcquisitionsPage() {
  const [activeCategory, setActiveCategory] = useState(defaultCategories[0].id)
  const [properties, setProperties] = useState<Listing[]>([])
  const [sources, setSources] = useState<SourceSearch[]>(defaultSourceSearches)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sourceForm, setSourceForm] = useState({ name: '', source: 'RealCommercial / CommercialRealEstate', url: '' })

  const category = defaultCategories.find((item) => item.id === activeCategory) || defaultCategories[0]

  useEffect(() => {
    async function load() {
      try {
        const [propertyRows, sourceRows] = await Promise.all([fetchProperties(), fetchSourceSearches()])
        setProperties(propertyRows.length ? propertyRows : getMockImportedListings())
        setSources(sourceRows.length ? sourceRows : defaultSourceSearches)
      } catch (error) {
        setProperties(getMockImportedListings())
        setSources(defaultSourceSearches)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const categoryMatches = useMemo(() => getCategoryMatches(properties, activeCategory), [properties, activeCategory])
  const reviewQueue = useMemo(() => {
    return properties
      .map((property) => ({ property, match: getBestMatch(property) }))
      .filter((item) => item.match.score >= 50 && item.match.score < 65)
      .sort((a, b) => b.match.score - a.match.score)
  }, [properties])
  const topMatches = useMemo(() => {
    return properties
      .map((property) => ({ property, match: getBestMatch(property) }))
      .filter((item) => item.match.score >= 65)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 5)
  }, [properties])

  async function saveSourceSearch() {
    if (!sourceForm.name || !sourceForm.url) {
      setMessage('Add a search name and saved search URL first.')
      return
    }
    const optimistic: SourceSearch = {
      id: String(Date.now()),
      categoryId: activeCategory,
      name: sourceForm.name,
      source: sourceForm.source,
      url: sourceForm.url,
      status: 'Active',
      lastChecked: 'Ready for first import',
      newMatches: 0,
    }
    setSources((current) => [optimistic, ...current])
    setSourceForm({ name: '', source: 'RealCommercial / CommercialRealEstate', url: '' })
    try {
      await insertSourceSearch({ categoryId: activeCategory, name: optimistic.name, source: optimistic.source, url: optimistic.url })
      setMessage('Saved source search. Next step is wiring scheduled import/scraping.')
    } catch (error) {
      setMessage('Saved locally in the UI. Run the v6 SQL helper if Supabase rejected source searches.')
    }
  }

  async function simulateImport() {
    const candidates = getMockImportedListings()
    const selected = candidates.find((item) => scoreAgainstCategory(item, category).passed) || candidates[0]
    try {
      const created = await insertProperty({ ...selected, title: `${selected.title} — Imported`, source: 'Saved Search Import', status: 'New Lead' })
      setProperties((current) => [created, ...current])
      setMessage(`Imported 1 demo property from saved searches into ${category.name}.`)
    } catch (error) {
      setMessage('Import simulation needs Supabase permissions/table alignment. The workflow UI is ready.')
    }
  }

  return (
    <AppShell
      title="Acquisition Engine"
      eyebrow="Automated Deal Sourcing"
      description="Create acquisition categories, attach saved search URLs, and have the platform sort incoming opportunities into the right criteria bucket. Level 1 uses saved searches; Level 3 will replace the importer with automated scraping/API feeds."
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Active categories" value={defaultCategories.length} />
            <Metric label="Saved searches" value={sources.length} />
            <Metric label="Top matches" value={topMatches.length} />
            <Metric label="Needs review" value={reviewQueue.length} />
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="label text-[#C59A42]">Acquisition Categories</p>
                <h3 className="text-2xl font-black text-[#08264A]">Auto-sort properties by strategy</h3>
              </div>
              <button onClick={simulateImport} className="gold-button"><Radar className="h-4 w-4" /> Simulate Saved Search Import</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {defaultCategories.map((item) => {
                const matches = getCategoryMatches(properties, item.id)
                const active = item.id === activeCategory
                return (
                  <button key={item.id} onClick={() => setActiveCategory(item.id)} className={`rounded-3xl border p-4 text-left transition ${active ? 'border-[#C59A42] bg-[#08264A] text-white shadow-xl shadow-[#08264A]/15' : 'border-black/10 bg-white/70 hover:border-[#C59A42]/50'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Target className={`h-5 w-5 ${active ? 'text-[#F5D58A]' : 'text-[#C59A42]'}`} />
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-white/10 text-[#F5D58A]' : 'bg-[#F5F0E8] text-[#08264A]'}`}>{matches.length} matches</span>
                    </div>
                    <h4 className="mt-3 font-black">{item.name}</h4>
                    <p className={`mt-2 text-xs leading-5 ${active ? 'text-white/65' : 'text-black/55'}`}>{item.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
              <div className="flex items-center gap-2 text-[#08264A]"><Filter className="h-5 w-5 text-[#C59A42]" /><h3 className="text-xl font-black">{category.name} Criteria</h3></div>
              <div className="mt-4 grid gap-3 text-sm">
                <CriteriaRow label="States" value={category.states.join(', ')} />
                <CriteriaRow label="Asset types" value={category.propertyTypes.join(', ')} />
                <CriteriaRow label="Price range" value={`${shortMoney(category.minPrice)} – ${shortMoney(category.maxPrice)}`} />
                <CriteriaRow label="Minimum yield" value={category.minYield ? `${category.minYield}%` : 'Flexible'} />
                <CriteriaRow label="Land size" value={`${m2(category.minLandSize)}+`} />
                <CriteriaRow label="Building size" value={category.minBuildingSize ? `${m2(category.minBuildingSize)}+` : 'Flexible'} />
                <CriteriaRow label="WALE" value={category.minWale ? `${category.minWale}+ years` : 'Flexible'} />
              </div>
              <div className="mt-5 rounded-3xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-4">
                <p className="text-sm font-bold text-[#08264A]">Level 3 pathway</p>
                <p className="mt-1 text-sm leading-6 text-black/60">Saved search URLs are the control layer. Later, the scraper/API importer will populate the same queue automatically.</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="label text-[#C59A42]">Matched Properties</p>
                  <h3 className="text-xl font-black text-[#08264A]">{category.name}</h3>
                </div>
                <span className="rounded-full bg-[#08264A] px-4 py-2 text-sm font-black text-[#F5D58A]">{categoryMatches.length} found</span>
              </div>
              <div className="space-y-3">
                {loading ? <p className="text-sm text-black/55">Loading acquisition queue...</p> : null}
                {!loading && categoryMatches.length === 0 ? <EmptyState text="No matching properties yet. Add saved search URLs or import properties." /> : null}
                {categoryMatches.slice(0, 6).map(({ property, match }) => (
                  <div key={`${property.id}-${category.id}`} className="rounded-3xl border border-black/10 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="font-black text-[#08264A]">{property.title}</h4>
                        <p className="mt-1 text-sm text-black/55">{property.address} · {money(property.price)} · {property.yieldPct}% yield</p>
                        <p className="mt-2 text-xs text-black/50">{property.source} · {property.agent}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-2xl font-black text-[#C59A42]">{match.score}%</p>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#08264A]">{match.grade} Match</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <ReasonList type="positive" items={match.positives.slice(0, 3)} />
                      <ReasonList type="negative" items={match.negatives.slice(0, 2)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-white/10 bg-[#08264A] p-5 text-white shadow-xl shadow-[#08264A]/20">
            <div className="flex items-center gap-2 text-[#F5D58A]"><Search className="h-5 w-5" /><h3 className="text-xl font-black">Source Searches</h3></div>
            <p className="mt-2 text-sm leading-6 text-white/60">Paste saved search URLs from commercial listing sites. The app will use these as the source list before we move to scraping.</p>
            <div className="mt-4 space-y-3">
              <input className="input bg-white text-[#08264A]" placeholder="Search name" value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} />
              <input className="input bg-white text-[#08264A]" placeholder="Listing source" value={sourceForm.source} onChange={(e) => setSourceForm({ ...sourceForm, source: e.target.value })} />
              <input className="input bg-white text-[#08264A]" placeholder="Paste saved search URL" value={sourceForm.url} onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} />
              <button onClick={saveSourceSearch} className="w-full rounded-2xl bg-[#C59A42] px-4 py-3 text-sm font-black text-[#08264A] shadow-lg shadow-black/20"><Plus className="mr-2 inline h-4 w-4" />Save Source Search</button>
            </div>
            {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">{message}</p> : null}
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <p className="label text-[#C59A42]">Active Sources</p>
            <div className="mt-4 space-y-3">
              {sources.filter((item) => item.categoryId === activeCategory).map((source) => (
                <div key={source.id} className="rounded-3xl border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-[#08264A]">{source.name}</h4>
                      <p className="mt-1 text-xs text-black/55">{source.source}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#C59A42]" />
                  </div>
                  <p className="mt-3 text-xs text-black/50">{source.status} · {source.lastChecked}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#C59A42]/25 bg-[#C59A42]/10 p-5">
            <div className="flex items-center gap-2 text-[#08264A]"><Sparkles className="h-5 w-5 text-[#C59A42]" /><h3 className="font-black">Level 3 Scraper Roadmap</h3></div>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-black/65">
              <li>1. Save source searches by category.</li>
              <li>2. Import listings into review queue.</li>
              <li>3. Auto-score against criteria.</li>
              <li>4. Replace manual importer with Apify/custom scraper/API.</li>
              <li>5. Schedule daily scans and alerts.</li>
            </ol>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur"><p className="label text-[#C59A42]">{label}</p><p className="mt-2 text-3xl font-black text-[#08264A]">{value}</p></div>
}

function CriteriaRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"><span className="font-bold text-black/55">{label}</span><span className="text-right font-black text-[#08264A]">{value}</span></div>
}

function ReasonList({ type, items }: { type: 'positive' | 'negative'; items: string[] }) {
  const positive = type === 'positive'
  const Icon = positive ? CheckCircle2 : AlertTriangle
  return <div className={`rounded-2xl border p-3 ${positive ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
    <div className={`mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] ${positive ? 'text-green-800' : 'text-amber-800'}`}><Icon className="h-4 w-4" />{positive ? 'Why it matched' : 'Review points'}</div>
    <ul className="space-y-1 text-xs text-black/60">
      {(items.length ? items : [positive ? 'No positive signals yet' : 'No major warnings']).map((item) => <li key={item}>• {item}</li>)}
    </ul>
  </div>
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-8 text-center text-sm text-black/55"><ArrowUpRight className="mx-auto mb-2 h-5 w-5 text-[#C59A42]" />{text}</div>
}
