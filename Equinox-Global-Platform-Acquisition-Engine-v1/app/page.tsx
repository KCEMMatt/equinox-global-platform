'use client'

import { useMemo, useState } from 'react'
import { Building2, ChartNoAxesCombined, ChevronRight, DatabaseZap, FileText, Filter, Globe2, LayoutDashboard, MapPin, Plus, Search, ShieldCheck, Sparkles, Target, Users } from 'lucide-react'

type Listing = {
  id: number
  title: string
  address: string
  state: string
  type: string
  price: number
  landSize: number
  buildingSize: number
  yieldPct: number
  leaseYears: number
  agent: string
  source: string
  status: string
  score: number
  notes: string
}

const gold = '#C59A42'

const nav = [
  ['Dashboard', LayoutDashboard],
  ['Acquisition Engine', Target],
  ['Property Feed', Building2],
  ['Map Intelligence', MapPin],
  ['Deal Pipeline', ChartNoAxesCombined],
  ['Documents', FileText],
  ['Contacts', Users],
  ['Settings', ShieldCheck],
] as const

const seedListings: Listing[] = [
  {
    id: 1,
    title: 'Prime Industrial Warehouse',
    address: 'Yatala, QLD',
    state: 'QLD',
    type: 'Industrial',
    price: 3850000,
    landSize: 4200,
    buildingSize: 1850,
    yieldPct: 6.8,
    leaseYears: 3.2,
    agent: 'CBRE Industrial',
    source: 'Manual / Agent',
    status: 'Reviewing',
    score: 91,
    notes: 'Strong corridor, good access to M1, tenant in place.',
  },
  {
    id: 2,
    title: 'Logistics Yard + Shed',
    address: 'Campbellfield, VIC',
    state: 'VIC',
    type: 'Industrial',
    price: 5200000,
    landSize: 6900,
    buildingSize: 2400,
    yieldPct: 5.9,
    leaseYears: 2.1,
    agent: 'JLL Melbourne',
    source: 'Commercial feed',
    status: 'New Lead',
    score: 78,
    notes: 'Large land component. Needs rent review analysis.',
  },
  {
    id: 3,
    title: 'Metro Warehouse Investment',
    address: 'Archerfield, QLD',
    state: 'QLD',
    type: 'Industrial',
    price: 2950000,
    landSize: 3100,
    buildingSize: 1320,
    yieldPct: 7.2,
    leaseYears: 4.6,
    agent: 'Ray White Commercial',
    source: 'Saved Listing',
    status: 'Underwriting',
    score: 88,
    notes: 'Good yield and lease term. Check flood overlay.',
  },
  {
    id: 4,
    title: 'Regional Industrial Landholding',
    address: 'Newcastle, NSW',
    state: 'NSW',
    type: 'Industrial Land',
    price: 1800000,
    landSize: 9800,
    buildingSize: 0,
    yieldPct: 0,
    leaseYears: 0,
    agent: 'Colliers',
    source: 'Off-market',
    status: 'Contacted',
    score: 72,
    notes: 'Development angle. Needs zoning and services review.',
  },
]

function money(value: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value || 0)
}

function shortMoney(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return money(value)
}

function m2(value: number) {
  return `${new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(value || 0)} m²`
}

function scoreLabel(score: number) {
  if (score >= 88) return 'A+ Opportunity'
  if (score >= 78) return 'A Opportunity'
  if (score >= 65) return 'B Watchlist'
  return 'Pass / Low Fit'
}

function scoreClass(score: number) {
  if (score >= 88) return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (score >= 78) return 'border-amber-200 bg-amber-50 text-amber-800'
  if (score >= 65) return 'border-blue-200 bg-blue-50 text-blue-800'
  return 'border-red-200 bg-red-50 text-red-800'
}

function statusClass(status: string) {
  if (status === 'Underwriting') return 'border-purple-200 bg-purple-50 text-purple-800'
  if (status === 'Reviewing') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'Contacted') return 'border-blue-200 bg-blue-50 text-blue-800'
  return 'border-black/10 bg-white text-black/70'
}

export default function Page() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState('All')
  const [minScore, setMinScore] = useState(70)
  const [listings, setListings] = useState<Listing[]>(seedListings)
  const [formOpen, setFormOpen] = useState(false)
  const [newDeal, setNewDeal] = useState({ title: '', address: '', state: 'QLD', price: '', yieldPct: '', landSize: '', buildingSize: '' })

  const filtered = useMemo(() => {
    return listings.filter((item) => {
      const search = `${item.title} ${item.address} ${item.agent} ${item.source}`.toLowerCase()
      const matchesSearch = search.includes(query.toLowerCase())
      const matchesState = state === 'All' || item.state === state
      const matchesScore = item.score >= minScore
      return matchesSearch && matchesState && matchesScore
    })
  }, [listings, minScore, query, state])

  const stats = useMemo(() => {
    const totalValue = filtered.reduce((sum, item) => sum + item.price, 0)
    const avgScore = filtered.length ? Math.round(filtered.reduce((sum, item) => sum + item.score, 0) / filtered.length) : 0
    const avgYield = filtered.length ? filtered.reduce((sum, item) => sum + item.yieldPct, 0) / filtered.length : 0
    const aGrade = filtered.filter((item) => item.score >= 78).length
    return { totalValue, avgScore, avgYield, aGrade }
  }, [filtered])

  function addDeal() {
    const price = Number(newDeal.price || 0)
    const yieldPct = Number(newDeal.yieldPct || 0)
    const landSize = Number(newDeal.landSize || 0)
    const buildingSize = Number(newDeal.buildingSize || 0)
    const score = Math.min(98, Math.max(50, Math.round(55 + yieldPct * 4 + (landSize >= 3000 ? 8 : 0) + (buildingSize >= 1000 ? 6 : 0))))
    const deal: Listing = {
      id: Date.now(),
      title: newDeal.title || 'New Commercial Opportunity',
      address: newDeal.address || 'Australia',
      state: newDeal.state,
      type: 'Industrial',
      price,
      landSize,
      buildingSize,
      yieldPct,
      leaseYears: 0,
      agent: 'To be added',
      source: 'Manual Entry',
      status: 'New Lead',
      score,
      notes: 'Freshly marked opportunity. Add agent, lease, zoning and document details next.',
    }
    setListings((current) => [deal, ...current])
    setNewDeal({ title: '', address: '', state: 'QLD', price: '', yieldPct: '', landSize: '', buildingSize: '' })
    setFormOpen(false)
  }

  return (
    <main className="min-h-screen text-[#1E252C]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#08264A]/95 p-5 text-white shadow-2xl lg:block">
          <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-[#C59A42]/40">
                <Globe2 className="h-6 w-6 text-[#C59A42]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#C59A42]">Equinox Global</p>
                <h1 className="text-lg font-bold leading-tight">Platform</h1>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {nav.map(([label, Icon]) => (
              <button key={label} className={`tab w-full ${label === 'Acquisition Engine' ? 'tab-active' : ''}`}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-[#C59A42]/25 bg-black/15 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C59A42]">First tool</p>
            <h2 className="mt-2 text-lg font-semibold">Acquisition Intelligence</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">Find, score and track suitable commercial properties across Australia.</p>
          </div>
        </aside>

        <section className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <header className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/75 shadow-sm backdrop-blur">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-[#C59A42]/15" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="label">Equinox Global Platform</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-[#08264A] md:text-5xl">Acquisition Engine</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60 md:text-base">Mark suitable commercial properties, score the opportunity, and move the best deals into the acquisition pipeline.</p>
                  </div>
                  <button onClick={() => setFormOpen((value) => !value)} className="btn btn-primary flex items-center justify-center gap-2 bg-[#08264A]">
                    <Plus className="h-4 w-4" />
                    Mark new opportunity
                  </button>
                </div>
              </div>
            </header>

            {formOpen && (
              <section className="card border-[#C59A42]/30">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#C59A42]" />
                  <h2 className="text-xl font-bold text-[#08264A]">Mark a property</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <input className="input md:col-span-2" placeholder="Property name" value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} />
                  <input className="input" placeholder="Suburb / address" value={newDeal.address} onChange={(e) => setNewDeal({ ...newDeal, address: e.target.value })} />
                  <select className="input" value={newDeal.state} onChange={(e) => setNewDeal({ ...newDeal, state: e.target.value })}>
                    {['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <input className="input" placeholder="Price" type="number" value={newDeal.price} onChange={(e) => setNewDeal({ ...newDeal, price: e.target.value })} />
                  <input className="input" placeholder="Yield %" type="number" value={newDeal.yieldPct} onChange={(e) => setNewDeal({ ...newDeal, yieldPct: e.target.value })} />
                  <input className="input" placeholder="Land m²" type="number" value={newDeal.landSize} onChange={(e) => setNewDeal({ ...newDeal, landSize: e.target.value })} />
                  <input className="input" placeholder="Building m²" type="number" value={newDeal.buildingSize} onChange={(e) => setNewDeal({ ...newDeal, buildingSize: e.target.value })} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setFormOpen(false)} className="btn btn-ghost">Cancel</button>
                  <button onClick={addDeal} className="btn btn-primary">Add to feed</button>
                </div>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-4">
              <Stat label="Marked opportunities" value={String(filtered.length)} icon={Target} />
              <Stat label="Pipeline value" value={shortMoney(stats.totalValue)} icon={Building2} />
              <Stat label="Average score" value={`${stats.avgScore}/100`} icon={DatabaseZap} />
              <Stat label="Average yield" value={`${stats.avgYield.toFixed(1)}%`} icon={ChartNoAxesCombined} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
              <div className="card">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="label">Live property feed</p>
                    <h2 className="mt-1 text-2xl font-bold text-[#08264A]">Suitable commercial properties</h2>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-black/40" />
                      <input className="input pl-9" placeholder="Search deals" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <select className="input sm:w-28" value={state} onChange={(e) => setState(e.target.value)}>
                      {['All', 'QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-5 rounded-2xl border border-black/10 bg-white/65 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#08264A]"><Filter className="h-4 w-4 text-[#C59A42]" /> Minimum deal score</div>
                    <div className="text-sm font-bold text-[#08264A]">{minScore}+</div>
                  </div>
                  <input className="mt-3 w-full accent-[#C59A42]" type="range" min="50" max="95" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
                </div>

                <div className="space-y-3">
                  {filtered.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-black/10 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreClass(item.score)}`}>{scoreLabel(item.score)}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span>
                          </div>
                          <h3 className="mt-3 text-xl font-black text-[#08264A]">{item.title}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-black/60"><MapPin className="h-4 w-4 text-[#C59A42]" /> {item.address}</p>
                          <p className="mt-2 text-sm text-black/55">{item.notes}</p>
                        </div>
                        <div className="grid min-w-[320px] grid-cols-2 gap-2 text-sm md:grid-cols-3">
                          <Metric label="Price" value={shortMoney(item.price)} />
                          <Metric label="Yield" value={`${item.yieldPct}%`} />
                          <Metric label="Score" value={`${item.score}/100`} />
                          <Metric label="Land" value={m2(item.landSize)} />
                          <Metric label="Building" value={m2(item.buildingSize)} />
                          <Metric label="Source" value={item.source} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="label">Map intelligence</p>
                      <h2 className="mt-1 text-2xl font-bold text-[#08264A]">Australia view</h2>
                    </div>
                    <MapPin className="h-6 w-6 text-[#C59A42]" />
                  </div>
                  <div className="relative h-72 overflow-hidden rounded-3xl border border-black/10 bg-[#08264A]">
                    <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(circle at 30% 35%, #C59A42, transparent 24%), radial-gradient(circle at 70% 55%, #ffffff, transparent 18%)' }} />
                    <div className="absolute left-[58%] top-[54%] h-28 w-24 rounded-[45%] border-2 border-[#C59A42]/60 bg-white/5 rotate-12" />
                    {filtered.map((item, index) => (
                      <div key={item.id} className="absolute flex h-9 w-9 items-center justify-center rounded-full border border-[#C59A42]/70 bg-[#C59A42] text-xs font-black text-[#08264A] shadow-lg" style={{ left: `${22 + (index * 17) % 54}%`, top: `${28 + (index * 13) % 48}%` }}>
                        {item.score}
                      </div>
                    ))}
                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-white backdrop-blur">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#C59A42]">Prototype map</p>
                      <p className="mt-1 text-sm text-white/75">Next step: connect Mapbox + real coordinates + clustering.</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <p className="label">Automation roadmap</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#08264A]">Build sequence</h2>
                  <div className="mt-4 space-y-3">
                    {[
                      'Manual property marking',
                      'Saved listing database',
                      'Deal score rules',
                      'Mapbox locations + clusters',
                      'Email/listing feed import',
                      'AI document extraction',
                    ].map((item, index) => (
                      <div key={item} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/65 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#C59A42]/15 text-sm font-black text-[#08264A]">{index + 1}</div>
                        <div className="flex-1 text-sm font-semibold text-black/70">{item}</div>
                        <ChevronRight className="h-4 w-4 text-black/30" />
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#08264A]">{value}</p>
        </div>
        <div className="rounded-2xl bg-[#C59A42]/15 p-3 text-[#C59A42]"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#F7F2EA]/65 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-black/40">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#08264A]">{value}</p>
    </div>
  )
}
