'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Play, Plus, Radar, Search, Target, Zap } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { m2, money, scoreLabel, shortMoney, type Listing } from '@/lib/mock-data'
import { fetchProperties, insertProperty } from '@/lib/properties'
import {
  defaultCategories,
  defaultSourceSearches,
  fetchImportedListings,
  fetchSourceSearches,
  getBestMatch,
  getCategoryMatches,
  getMockImportedListings,
  insertSourceSearch,
  scoreAgainstCategory,
  type ImportedListing,
  type SourceSearch,
} from '@/lib/acquisition-engine'

export default function AcquisitionsPage() {
  const [activeCategory, setActiveCategory] = useState(defaultCategories[0].id)
  const [properties, setProperties] = useState<Listing[]>([])
  const [sources, setSources] = useState<SourceSearch[]>(defaultSourceSearches)
  const [imports, setImports] = useState<ImportedListing[]>([])
  const [loading, setLoading] = useState(true)
  const [busySource, setBusySource] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sourceForm, setSourceForm] = useState({ name: '', source: 'Saved Listing / Search URL', url: '', importMode: 'single_listing' as SourceSearch['importMode'] })

  const category = defaultCategories.find((item) => item.id === activeCategory) || defaultCategories[0]

  async function refresh() {
    const [propertyRows, sourceRows, importRows] = await Promise.all([fetchProperties(), fetchSourceSearches(), fetchImportedListings()])
    setProperties(propertyRows.length ? propertyRows : getMockImportedListings())
    setSources(sourceRows.length ? sourceRows : defaultSourceSearches)
    setImports(importRows)
  }

  useEffect(() => {
    refresh().catch(() => {
      setProperties(getMockImportedListings())
      setSources(defaultSourceSearches)
    }).finally(() => setLoading(false))
  }, [])

  const categoryMatches = useMemo(() => getCategoryMatches(properties, activeCategory), [properties, activeCategory])
  const topMatches = useMemo(() => properties.map((property) => ({ property, match: getBestMatch(property) })).filter((item) => item.match.score >= 65).sort((a, b) => b.match.score - a.match.score).slice(0, 5), [properties])
  const reviewQueue = useMemo(() => properties.map((property) => ({ property, match: getBestMatch(property) })).filter((item) => item.match.score >= 45 && item.match.score < 65).sort((a, b) => b.match.score - a.match.score), [properties])
  const activeSources = sources.filter((item) => item.categoryId === activeCategory)

  async function saveSourceSearch() {
    if (!sourceForm.name || !sourceForm.url) {
      setMessage('Add a source name and URL first.')
      return
    }
    const optimistic: SourceSearch = {
      id: String(Date.now()),
      categoryId: activeCategory,
      name: sourceForm.name,
      source: sourceForm.source,
      url: sourceForm.url,
      status: 'Active',
      lastChecked: 'Ready for import',
      newMatches: 0,
      importMode: sourceForm.importMode,
    }
    setSources((current) => [optimistic, ...current])
    setSourceForm({ name: '', source: 'Saved Listing / Search URL', url: '', importMode: 'single_listing' })
    try {
      await insertSourceSearch({ categoryId: activeCategory, name: optimistic.name, source: optimistic.source, url: optimistic.url, importMode: optimistic.importMode })
      setMessage('Source saved. Use Run Import to pull it into the review queue.')
      await refresh()
    } catch {
      setMessage('Saved locally. Run supabase/level3_importer_v7.sql if Supabase rejects source searches.')
    }
  }

  async function runSourceImport(source: SourceSearch) {
    if (!source.url || source.url.includes('Paste saved')) {
      setMessage('Paste a real listing/source URL first.')
      return
    }
    setBusySource(source.id)
    setMessage('Running Level 3 importer...')
    try {
      const res = await fetch('/api/import-source', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceSearchId: source.id, url: source.url, mode: source.importMode || 'single_listing' }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Import failed')
      setMessage('Imported listing into Properties and the review queue. Check the matched category score before acting.')
      await refresh()
    } catch (error: any) {
      setMessage(error?.message || 'Importer failed. Some sites block server-side fetching; use the webhook/external scraper path for those.')
    } finally {
      setBusySource(null)
    }
  }

  async function simulateImport() {
    const candidates = getMockImportedListings()
    const selected = candidates.find((item) => scoreAgainstCategory(item, category).passed) || candidates[0]
    try {
      const created = await insertProperty({ ...selected, title: `${selected.title} — Imported`, source: 'Saved Search Import', status: 'New Lead' })
      setProperties((current) => [created, ...current])
      setMessage(`Imported 1 demo property into ${category.name}.`)
    } catch {
      setMessage('Demo import needs Supabase permissions/table alignment. The workflow UI is ready.')
    }
  }

  return (
    <AppShell
      title="Acquisition Engine"
      eyebrow="Level 3 Sourcing System"
      description="Saved sources now feed a real import pipeline. Start with manual listing/source URLs, then upgrade to external scraper/webhook feeds without rebuilding the workflow."
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Categories" value={defaultCategories.length} />
            <Metric label="Sources" value={sources.length} />
            <Metric label="Top matches" value={topMatches.length} />
            <Metric label="Review queue" value={reviewQueue.length + imports.length} />
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="label text-[#C59A42]">Acquisition Categories</p>
                <h3 className="text-2xl font-black text-[#08264A]">Properties automatically sorted by strategy</h3>
              </div>
              <button onClick={simulateImport} className="gold-button"><Radar className="h-4 w-4" /> Demo Import</button>
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
              <div className="flex items-center gap-2 text-[#08264A]"><Zap className="h-5 w-5 text-[#C59A42]" /><h3 className="text-xl font-black">Level 3 Import Pipeline</h3></div>
              <div className="mt-4 space-y-3 text-sm text-black/60">
                <PipelineStep title="1. Source Control" text="Save listing URLs, saved search URLs, or external scraper feed sources per acquisition category." />
                <PipelineStep title="2. Import Queue" text="The importer extracts title, address, price, asset type and description into Supabase." />
                <PipelineStep title="3. Auto Score" text="Imported properties are matched against Core Industrial, Value-Add, Hardstand and Development Land criteria." />
                <PipelineStep title="4. Human Review" text="You still approve the deal before contacting agents or moving it into underwriting." />
              </div>
              <div className="mt-5 rounded-3xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-4">
                <p className="text-sm font-bold text-[#08264A]">External scraper webhook</p>
                <p className="mt-1 text-xs leading-5 text-black/60">Endpoint ready: <span className="font-mono">/api/apify-webhook</span>. Later, Apify/custom scrapers can post listings directly into this same workflow.</p>
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
                {!loading && categoryMatches.length === 0 ? <EmptyState text="No matching properties yet. Add source URLs or import properties." /> : null}
                {categoryMatches.slice(0, 6).map(({ property, match }) => (
                  <div key={`${property.id}-${category.id}`} className="rounded-3xl border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-black text-[#08264A]">{property.title}</h4>
                        <p className="mt-1 text-sm text-black/55">{property.address}</p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-black/45">{money(property.price)} · {property.yieldPct}% yield · {m2(property.landSize)}</p>
                      </div>
                      <div className="text-right">
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
            <p className="mt-2 text-sm leading-6 text-white/60">Paste a commercial listing URL first. Some saved-search pages may block direct import; those will later run through the external scraper webhook.</p>
            <div className="mt-4 space-y-3">
              <input className="input bg-white text-[#08264A]" placeholder="Source name" value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} />
              <input className="input bg-white text-[#08264A]" placeholder="Source type" value={sourceForm.source} onChange={(e) => setSourceForm({ ...sourceForm, source: e.target.value })} />
              <select className="input bg-white text-[#08264A]" value={sourceForm.importMode} onChange={(e) => setSourceForm({ ...sourceForm, importMode: e.target.value as SourceSearch['importMode'] })}>
                <option value="single_listing">Single listing URL</option>
                <option value="saved_search">Saved search URL</option>
                <option value="apify">External scraper feed</option>
                <option value="manual">Manual review source</option>
              </select>
              <input className="input bg-white text-[#08264A]" placeholder="Paste URL" value={sourceForm.url} onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} />
              <button onClick={saveSourceSearch} className="w-full rounded-2xl bg-[#C59A42] px-4 py-3 text-sm font-black text-[#08264A] shadow-lg shadow-black/20"><Plus className="mr-2 inline h-4 w-4" />Save Source</button>
            </div>
            {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">{message}</p> : null}
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <p className="label text-[#C59A42]">Active Sources</p>
            <div className="mt-4 space-y-3">
              {activeSources.map((source) => (
                <div key={source.id} className="rounded-3xl border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-[#08264A]">{source.name}</h4>
                      <p className="mt-1 text-xs text-black/55">{source.source}</p>
                      <p className="mt-2 break-all text-xs text-black/45">{source.url}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#C59A42]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-black/50">{source.status} · {source.lastChecked}</p>
                    <button onClick={() => runSourceImport(source)} disabled={busySource === source.id} className="rounded-full bg-[#08264A] px-3 py-2 text-xs font-black text-[#F5D58A] disabled:opacity-50"><Play className="mr-1 inline h-3 w-3" />{busySource === source.id ? 'Running' : 'Run Import'}</button>
                  </div>
                </div>
              ))}
              {!activeSources.length ? <EmptyState text="No sources for this category yet." /> : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <p className="label text-[#C59A42]">Recent Imports</p>
            <div className="mt-4 space-y-3">
              {imports.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-3xl border border-black/10 bg-white p-4">
                  <h4 className="font-black text-[#08264A]">{item.rawTitle}</h4>
                  <p className="mt-1 text-xs text-black/55">{item.rawAddress || 'Address review needed'}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[#C59A42]">{item.importStatus}</p>
                </div>
              ))}
              {!imports.length ? <EmptyState text="No live imports yet." /> : null}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl shadow-[#08264A]/5"><p className="label text-[#C59A42]">{label}</p><p className="mt-2 text-3xl font-black text-[#08264A]">{value}</p></div>
}

function PipelineStep({ title, text }: { title: string; text: string }) {
  return <div className="rounded-3xl border border-black/10 bg-white p-4"><p className="font-black text-[#08264A]">{title}</p><p className="mt-1 leading-6">{text}</p></div>
}

function ReasonList({ type, items }: { type: 'positive' | 'negative'; items: string[] }) {
  const Icon = type === 'positive' ? CheckCircle2 : AlertTriangle
  const colour = type === 'positive' ? 'text-emerald-700' : 'text-amber-700'
  if (!items.length) return <div className="rounded-2xl bg-[#F5F0E8] p-3 text-xs text-black/45">No {type === 'positive' ? 'positive' : 'warning'} signals.</div>
  return <div className="rounded-2xl bg-[#F5F0E8] p-3">{items.map((item) => <p key={item} className={`flex gap-2 text-xs leading-5 ${colour}`}><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item}</p>)}</div>
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-5 text-sm text-black/50">{text}</div>
}
