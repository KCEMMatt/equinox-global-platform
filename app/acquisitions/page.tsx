'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BellRing, BrainCircuit, CalendarClock, CheckCircle2, ExternalLink, Eye, Play, Plus, Radar, Search, Sparkles, Target, Trash2, Zap } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { m2, money, type Listing } from '@/lib/mock-data'
import { fetchProperties, insertProperty, updatePropertyStage } from '@/lib/properties'
import {
  defaultCategories,
  defaultSourceSearches,
  fetchImportedListings,
  fetchSourceSearches,
  getBestMatch,
  getCategoryMatches,
  getImportHealth,
  getMockImportedListings,
  insertSourceSearch,
  scoreAgainstCategory,
  updateImportedListingStatus,
  type ImportedListing,
  type SourceSearch,
} from '@/lib/acquisition-engine'
import { buildDailyAcquisitionFeed } from '@/lib/ai-enrichment'

export default function AcquisitionsPage() {
  const [activeCategory, setActiveCategory] = useState(defaultCategories[0].id)
  const [properties, setProperties] = useState<Listing[]>([])
  const [sources, setSources] = useState<SourceSearch[]>(defaultSourceSearches)
  const [imports, setImports] = useState<ImportedListing[]>([])
  const [loading, setLoading] = useState(true)
  const [busySource, setBusySource] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busyAutomation, setBusyAutomation] = useState(false)
  const [automationResult, setAutomationResult] = useState('')
  const [sourceForm, setSourceForm] = useState({ name: '', source: 'Saved Listing / Search URL', url: '', importMode: 'single_listing' as SourceSearch['importMode'] })

  const category = defaultCategories.find((item) => item.id === activeCategory) || defaultCategories[0]

  async function refresh() {
    const [propertyRows, sourceRows, importRows] = await Promise.all([fetchProperties(), fetchSourceSearches(), fetchImportedListings(30)])
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
  const ranked = useMemo(() => properties.map((property) => ({ property, match: getBestMatch(property) })).sort((a, b) => b.match.score - a.match.score), [properties])
  const topMatches = ranked.filter((item) => item.match.score >= 65 && !['Passed', 'Ignored'].includes(item.property.status)).slice(0, 5)
  const reviewQueue = ranked.filter((item) => item.match.score >= 45 && item.match.score < 65 && !['Passed', 'Ignored'].includes(item.property.status))
  const activeSources = sources.filter((item) => item.categoryId === activeCategory)
  const health = getImportHealth(sources, imports)
  const dailyFeed = useMemo(() => buildDailyAcquisitionFeed(properties), [properties])

  async function saveSourceSearch() {
    if (!sourceForm.name || !sourceForm.url) return setMessage('Add a source name and URL first.')
    const optimistic: SourceSearch = { id: String(Date.now()), categoryId: activeCategory, name: sourceForm.name, source: sourceForm.source, url: sourceForm.url, status: 'Active', lastChecked: 'Ready for import', newMatches: 0, importMode: sourceForm.importMode }
    setSources((current) => [optimistic, ...current])
    setSourceForm({ name: '', source: 'Saved Listing / Search URL', url: '', importMode: 'single_listing' })
    try {
      await insertSourceSearch({ categoryId: activeCategory, name: optimistic.name, source: optimistic.source, url: optimistic.url, importMode: optimistic.importMode })
      setMessage('Source saved. Use Run Import to pull it into the review queue.')
      await refresh()
    } catch {
      setMessage('Saved locally. Run the v8 SQL if Supabase rejects source searches.')
    }
  }

  async function runSourceImport(source: SourceSearch) {
    if (!source.url || source.url.includes('Paste saved')) return setMessage('Paste a real listing/source URL first.')
    setBusySource(source.id)
    setMessage('Running Level 3 importer...')
    try {
      const res = await fetch('/api/import-source', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceSearchId: source.id, url: source.url, mode: source.importMode || 'single_listing' }) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Import failed')
      setMessage(json.duplicate ? 'Duplicate detected — existing property was not duplicated.' : 'Imported listing, scored it, and added it to the review workflow.')
      await refresh()
    } catch (error: any) {
      setMessage(error?.message || 'Importer failed. Some sites block server-side fetching; use the webhook/external scraper path for those.')
    } finally {
      setBusySource(null)
    }
  }

  async function simulateImport() {
    const selected = getMockImportedListings().find((item) => scoreAgainstCategory(item, category).passed) || getMockImportedListings()[0]
    try {
      const created = await insertProperty({ ...selected, title: `${selected.title} — Imported`, source: 'Saved Search Import', status: 'New Lead' })
      setProperties((current) => [created, ...current])
      setMessage(`Imported 1 demo property into ${category.name}.`)
    } catch {
      setMessage('Demo import needs Supabase permissions/table alignment. The workflow UI is ready.')
    }
  }

  async function actOnProperty(property: Listing, stage: string) {
    setProperties((current) => current.map((item) => String(item.id) === String(property.id) ? { ...item, status: stage } : item))
    try {
      await updatePropertyStage(property.id, stage)
      setMessage(`Moved ${property.title} to ${stage}.`)
      await refresh()
    } catch {
      setMessage(`Marked locally as ${stage}.`)
    }
  }

  async function actOnImport(item: ImportedListing, status: string) {
    setImports((current) => current.map((row) => row.id === item.id ? { ...row, importStatus: status } : row))
    try {
      await updateImportedListingStatus(item.id, status, status === 'ignored' ? 'Ignored from acquisition review.' : 'Marked for review.')
      setMessage(`Import marked as ${status}.`)
      await refresh()
    } catch {
      setMessage(`Import marked locally as ${status}.`)
    }
  }

  async function runScheduledImports() {
    setBusyAutomation(true)
    setAutomationResult('Running scheduled import workflow...')
    try {
      const res = await fetch('/api/run-scheduled-imports', { method: 'POST' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Scheduled import failed')
      setAutomationResult(`Checked ${json.checked} sources · ${json.successful} successful · ${json.failed} failed`)
      await refresh()
    } catch (error: any) {
      setAutomationResult(error?.message || 'Scheduled import failed')
    } finally {
      setBusyAutomation(false)
    }
  }

  async function enrichTopOpportunity() {
    const top = dailyFeed[0]?.property
    if (!top) return setAutomationResult('No property available to enrich yet.')
    setBusyAutomation(true)
    setAutomationResult(`Generating AI-style acquisition summary for ${top.title}...`)
    try {
      const res = await fetch('/api/ai-enrich-property', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ propertyId: top.id }) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'AI enrichment failed')
      setAutomationResult('AI summary, risk flags and opportunity insights saved to Supabase.')
      await refresh()
    } catch (error: any) {
      setAutomationResult(error?.message || 'AI enrichment failed')
    } finally {
      setBusyAutomation(false)
    }
  }

  return (
    <AppShell title="Acquisition Engine" eyebrow="Level 3 Daily Workflow" description="Automatically intake source opportunities, detect duplicates, score them against categories, and move the best deals into action.">
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Active sources" value={health.activeSources} />
            <Metric label="Top matches" value={topMatches.length} />
            <Metric label="Review required" value={health.reviewRequired + reviewQueue.length} />
            <Metric label="Duplicates" value={health.duplicates} />
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#08264A]"><Sparkles className="h-5 w-5 text-[#C59A42]" /><p className="label text-[#C59A42]">v9 Automation</p></div>
                <h3 className="mt-2 text-2xl font-black text-[#08264A]">Daily acquisition feed</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">The engine ranks live properties, prepares AI-style summaries, flags risks and can run the scheduled importer manually while cron automation is being finalised.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={runScheduledImports} disabled={busyAutomation} className="rounded-2xl bg-[#08264A] px-4 py-3 text-sm font-black text-[#F5D58A] disabled:opacity-50"><CalendarClock className="mr-2 inline h-4 w-4" />Run Scheduled Imports</button>
                <button onClick={enrichTopOpportunity} disabled={busyAutomation} className="rounded-2xl bg-[#C59A42] px-4 py-3 text-sm font-black text-[#08264A] disabled:opacity-50"><BrainCircuit className="mr-2 inline h-4 w-4" />Enrich Top Deal</button>
              </div>
            </div>
            {automationResult ? <p className="mt-4 rounded-2xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-3 text-sm font-bold text-[#08264A]"><BellRing className="mr-2 inline h-4 w-4" />{automationResult}</p> : null}
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {dailyFeed.slice(0, 4).map((item) => <div key={`feed-${item.property.id}`} className="rounded-3xl border border-black/10 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-[#08264A]">{item.property.title}</h4><p className="mt-1 text-xs text-black/55">{item.match.category.name} · {item.match.score}% match</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${item.enrichment.notificationPriority === 'high' ? 'bg-[#C59A42] text-[#08264A]' : 'bg-[#F5F0E8] text-[#08264A]'}`}>{item.enrichment.notificationPriority}</span></div><p className="mt-3 text-xs leading-5 text-black/60">{item.enrichment.aiSummary}</p></div>)}
              {!dailyFeed.length ? <EmptyState text="No daily feed items yet. Add/import properties first." /> : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="label text-[#C59A42]">Acquisition Categories</p><h3 className="text-2xl font-black text-[#08264A]">Automatically sorted by strategy</h3></div>
              <button onClick={simulateImport} className="gold-button"><Radar className="h-4 w-4" /> Demo Import</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {defaultCategories.map((item) => {
                const matches = getCategoryMatches(properties, item.id)
                const active = item.id === activeCategory
                return <button key={item.id} onClick={() => setActiveCategory(item.id)} className={`rounded-3xl border p-4 text-left transition ${active ? 'border-[#C59A42] bg-[#08264A] text-white shadow-xl shadow-[#08264A]/15' : 'border-black/10 bg-white/70 hover:border-[#C59A42]/50'}`}>
                  <div className="flex items-center justify-between gap-3"><Target className={`h-5 w-5 ${active ? 'text-[#F5D58A]' : 'text-[#C59A42]'}`} /><span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-white/10 text-[#F5D58A]' : 'bg-[#F5F0E8] text-[#08264A]'}`}>{matches.length} matches</span></div>
                  <h4 className="mt-3 font-black">{item.name}</h4><p className={`mt-2 text-xs leading-5 ${active ? 'text-white/65' : 'text-black/55'}`}>{item.description}</p>
                </button>
              })}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
            <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
              <div className="flex items-center gap-2 text-[#08264A]"><Zap className="h-5 w-5 text-[#C59A42]" /><h3 className="text-xl font-black">Import Health</h3></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <HealthCard label="Checked sources" value={`${health.checkedSources}/${health.totalSources}`} />
                <HealthCard label="Imported today" value={health.importedToday} />
                <HealthCard label="Failed imports" value={health.failedImports} />
                <HealthCard label="Last checked" value={health.lastChecked} small />
              </div>
              <div className="mt-5 rounded-3xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-4">
                <p className="text-sm font-bold text-[#08264A]">External scraper webhook ready</p>
                <p className="mt-1 text-xs leading-5 text-black/60"><span className="font-mono">/api/apify-webhook</span> accepts listing feeds and sends them through the same duplicate detection, scoring, and review workflow.</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="label text-[#C59A42]">Top Matches</p><h3 className="text-xl font-black text-[#08264A]">{category.name}</h3></div><span className="rounded-full bg-[#08264A] px-4 py-2 text-sm font-black text-[#F5D58A]">{categoryMatches.length} found</span></div>
              <div className="space-y-3">
                {loading ? <p className="text-sm text-black/55">Loading acquisition queue...</p> : null}
                {!loading && categoryMatches.length === 0 ? <EmptyState text="No matching properties yet. Add source URLs or import properties." /> : null}
                {categoryMatches.slice(0, 6).map(({ property, match, duplicate }) => <PropertyCard key={`${property.id}-${category.id}`} property={property} match={match} duplicate={duplicate} onAction={actOnProperty} />)}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="mb-4 flex items-center justify-between"><div><p className="label text-[#C59A42]">Review Queue</p><h3 className="text-xl font-black text-[#08264A]">Needs human decision</h3></div><Eye className="h-5 w-5 text-[#C59A42]" /></div>
            <div className="grid gap-3 lg:grid-cols-2">
              {reviewQueue.slice(0, 4).map(({ property, match }) => <PropertyCard key={`review-${property.id}`} property={property} match={match} onAction={actOnProperty} compact />)}
              {!reviewQueue.length ? <EmptyState text="No medium-score properties waiting for review." /> : null}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-white/10 bg-[#08264A] p-5 text-white shadow-xl shadow-[#08264A]/20">
            <div className="flex items-center gap-2 text-[#F5D58A]"><Search className="h-5 w-5" /><h3 className="text-xl font-black">Source Searches</h3></div>
            <p className="mt-2 text-sm leading-6 text-white/60">Paste a listing URL first. For high-volume sources, connect Apify/custom scraper output to the webhook.</p>
            <div className="mt-4 space-y-3">
              <input className="input bg-white text-[#08264A]" placeholder="Source name" value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} />
              <input className="input bg-white text-[#08264A]" placeholder="Source type" value={sourceForm.source} onChange={(e) => setSourceForm({ ...sourceForm, source: e.target.value })} />
              <select className="input bg-white text-[#08264A]" value={sourceForm.importMode} onChange={(e) => setSourceForm({ ...sourceForm, importMode: e.target.value as SourceSearch['importMode'] })}><option value="single_listing">Single listing URL</option><option value="saved_search">Saved search URL</option><option value="apify">External scraper feed</option><option value="manual">Manual review source</option></select>
              <input className="input bg-white text-[#08264A]" placeholder="Paste URL" value={sourceForm.url} onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} />
              <button onClick={saveSourceSearch} className="w-full rounded-2xl bg-[#C59A42] px-4 py-3 text-sm font-black text-[#08264A] shadow-lg shadow-black/20"><Plus className="mr-2 inline h-4 w-4" />Save Source</button>
            </div>
            {message ? <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">{message}</p> : null}
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur"><p className="label text-[#C59A42]">Active Sources</p><div className="mt-4 space-y-3">{activeSources.map((source) => <div key={source.id} className="rounded-3xl border border-black/10 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-[#08264A]">{source.name}</h4><p className="mt-1 text-xs text-black/55">{source.source}</p><p className="mt-2 break-all text-xs text-black/45">{source.url}</p></div><ExternalLink className="h-4 w-4 text-[#C59A42]" /></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-black/50">{source.status} · {source.lastChecked}</p><button onClick={() => runSourceImport(source)} disabled={busySource === source.id} className="rounded-full bg-[#08264A] px-3 py-2 text-xs font-black text-[#F5D58A] disabled:opacity-50"><Play className="mr-1 inline h-3 w-3" />{busySource === source.id ? 'Running' : 'Run Import'}</button></div></div>)}{!activeSources.length ? <EmptyState text="No sources for this category yet." /> : null}</div></div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur"><p className="label text-[#C59A42]">Recent Imports</p><div className="mt-4 space-y-3">{imports.slice(0, 6).map((item) => <div key={item.id} className="rounded-3xl border border-black/10 bg-white p-4"><div className="flex items-start justify-between gap-2"><div><h4 className="font-black text-[#08264A]">{item.rawTitle}</h4><p className="mt-1 text-xs text-black/55">{item.rawAddress || 'Address review needed'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.importStatus === 'duplicate' ? 'bg-red-50 text-red-700' : 'bg-[#F5F0E8] text-[#08264A]'}`}>{item.importStatus}</span></div><p className="mt-2 text-xs text-black/50">{item.reviewNotes}</p><div className="mt-3 flex gap-2"><button onClick={() => actOnImport(item, 'review_required')} className="rounded-full bg-[#08264A] px-3 py-2 text-xs font-black text-[#F5D58A]">Review</button><button onClick={() => actOnImport(item, 'ignored')} className="rounded-full bg-black/5 px-3 py-2 text-xs font-black text-black/60"><Trash2 className="mr-1 inline h-3 w-3" />Ignore</button></div></div>)}{!imports.length ? <EmptyState text="No live imports yet." /> : null}</div></div>
        </aside>
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl shadow-[#08264A]/5"><p className="label text-[#C59A42]">{label}</p><p className="mt-2 text-3xl font-black text-[#08264A]">{value}</p></div> }
function HealthCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) { return <div className="rounded-3xl border border-black/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">{label}</p><p className={`${small ? 'text-sm' : 'text-2xl'} mt-2 font-black text-[#08264A]`}>{value}</p></div> }
function EmptyState({ text }: { text: string }) { return <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-5 text-sm text-black/50">{text}</div> }

function ReasonList({ type, items }: { type: 'positive' | 'negative'; items: string[] }) {
  const Icon = type === 'positive' ? CheckCircle2 : AlertTriangle
  const colour = type === 'positive' ? 'text-emerald-700' : 'text-amber-700'
  if (!items.length) return <div className="rounded-2xl bg-[#F5F0E8] p-3 text-xs text-black/45">No {type === 'positive' ? 'positive' : 'warning'} signals.</div>
  return <div className="rounded-2xl bg-[#F5F0E8] p-3">{items.map((item) => <p key={item} className={`flex gap-2 text-xs leading-5 ${colour}`}><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item}</p>)}</div>
}

function PropertyCard({ property, match, duplicate, onAction, compact }: { property: Listing; match: any; duplicate?: Listing; onAction: (property: Listing, stage: string) => void; compact?: boolean }) {
  return <div className="rounded-3xl border border-black/10 bg-white p-4">
    <div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-[#08264A]">{property.title}</h4><p className="mt-1 text-sm text-black/55">{property.address}</p><p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-black/45">{money(property.price)} · {property.yieldPct}% yield · {m2(property.landSize)}</p></div><div className="text-right"><p className="text-2xl font-black text-[#C59A42]">{match.score}%</p><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#08264A]">{match.grade} Match</p></div></div>
    {duplicate ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">Possible duplicate of: {duplicate.title}</p> : null}
    {!compact ? <div className="mt-3 grid gap-2 md:grid-cols-2"><ReasonList type="positive" items={match.positives.slice(0, 3)} /><ReasonList type="negative" items={match.negatives.slice(0, 2)} /></div> : null}
    <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => onAction(property, 'Shortlisted')} className="rounded-full bg-[#C59A42] px-3 py-2 text-xs font-black text-[#08264A]">Shortlist</button><button onClick={() => onAction(property, 'Review Later')} className="rounded-full bg-[#08264A] px-3 py-2 text-xs font-black text-[#F5D58A]">Review Later</button><button onClick={() => onAction(property, 'Passed')} className="rounded-full bg-black/5 px-3 py-2 text-xs font-black text-black/60">Pass</button></div>
  </div>
}
