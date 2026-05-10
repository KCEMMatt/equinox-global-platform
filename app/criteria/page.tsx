'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, Building2, CheckCircle2, CircleDollarSign, DatabaseZap, Gauge, Globe2, MapPin, Plus, Save, SlidersHorizontal, Sparkles, Target, Warehouse, XCircle } from 'lucide-react'

type Profile = {
  id: number
  name: string
  description: string
  propertyTypes: string[]
  states: string[]
  minPrice: number
  maxPrice: number
  minYield: number
  minLandSize: number
  minBuildingSize: number
  minWale: number
  zoning: string[]
  requireFullOccupancy: boolean
}

type Property = {
  id: number
  name: string
  state: string
  type: string
  price: number
  yieldPct: number
  landSize: number
  buildingSize: number
  wale: number
  zoning: string
  occupancy: number
}

const states = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const propertyTypes = ['Industrial', 'Industrial Land', 'Warehouse', 'Logistics', 'Hardstand']
const zoningOptions = ['Industrial', 'General Industry', 'Low Impact Industry', 'Mixed Use', 'Special Industry']

const seedProfiles: Profile[] = [
  {
    id: 1,
    name: 'Core Industrial',
    description: 'Stabilised income assets with strong fundamentals and quality access.',
    propertyTypes: ['Industrial', 'Warehouse', 'Logistics'],
    states: ['QLD', 'NSW', 'VIC'],
    minPrice: 2000000,
    maxPrice: 15000000,
    minYield: 6,
    minLandSize: 3000,
    minBuildingSize: 1000,
    minWale: 3,
    zoning: ['Industrial', 'General Industry'],
    requireFullOccupancy: true,
  },
  {
    id: 2,
    name: 'Hardstand Assets',
    description: 'Low site coverage, yard-heavy properties for transport and storage users.',
    propertyTypes: ['Hardstand', 'Industrial Land', 'Logistics'],
    states: ['QLD', 'NSW', 'VIC', 'WA'],
    minPrice: 1000000,
    maxPrice: 12000000,
    minYield: 5,
    minLandSize: 5000,
    minBuildingSize: 0,
    minWale: 0,
    zoning: ['Industrial', 'General Industry', 'Special Industry'],
    requireFullOccupancy: false,
  },
]

const sampleProperties: Property[] = [
  { id: 1, name: 'Yatala Industrial Warehouse', state: 'QLD', type: 'Industrial', price: 3850000, yieldPct: 6.8, landSize: 4200, buildingSize: 1850, wale: 3.2, zoning: 'Industrial', occupancy: 100 },
  { id: 2, name: 'Campbellfield Logistics Yard', state: 'VIC', type: 'Logistics', price: 5200000, yieldPct: 5.9, landSize: 6900, buildingSize: 2400, wale: 2.1, zoning: 'General Industry', occupancy: 100 },
  { id: 3, name: 'Newcastle Development Land', state: 'NSW', type: 'Industrial Land', price: 1800000, yieldPct: 0, landSize: 9800, buildingSize: 0, wale: 0, zoning: 'Industrial', occupancy: 0 },
  { id: 4, name: 'Archerfield Metro Warehouse', state: 'QLD', type: 'Warehouse', price: 2950000, yieldPct: 7.2, landSize: 3100, buildingSize: 1320, wale: 4.6, zoning: 'Industrial', occupancy: 100 },
]

function money(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  return `$${new Intl.NumberFormat('en-AU').format(value)}`
}

function toggleItem(list: string[], item: string) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

function grade(score: number) {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'Watch'
  return 'Pass'
}

function scoreProperty(property: Property, profile: Profile) {
  const positives: string[] = []
  const negatives: string[] = []
  let score = 0
  let total = 0

  function add(weight: number, passed: boolean, positive: string, negative: string) {
    total += weight
    if (passed) {
      score += weight
      positives.push(positive)
    } else {
      negatives.push(negative)
    }
  }

  add(15, profile.states.includes(property.state), `${property.state} is in target states`, `${property.state} is outside target states`)
  add(15, profile.propertyTypes.includes(property.type), `${property.type} matches target asset type`, `${property.type} is not a preferred asset type`)
  add(15, property.price >= profile.minPrice && property.price <= profile.maxPrice, 'Price sits inside target range', 'Price is outside target range')
  add(15, property.yieldPct >= profile.minYield, `Yield meets ${profile.minYield}%+ target`, `Yield below ${profile.minYield}% target`)
  add(12, property.landSize >= profile.minLandSize, 'Land size meets target', 'Land size below target')
  add(10, property.buildingSize >= profile.minBuildingSize, 'Building size meets target', 'Building size below target')
  add(8, property.wale >= profile.minWale, 'WALE meets target', 'WALE below target')
  add(6, profile.zoning.includes(property.zoning), 'Zoning matches criteria', 'Zoning does not match criteria')
  add(4, !profile.requireFullOccupancy || property.occupancy === 100, 'Occupancy requirement met', 'Occupancy requirement not met')

  const finalScore = Math.round((score / total) * 100)
  return { score: finalScore, grade: grade(finalScore), positives, negatives }
}

export default function CriteriaPage() {
  const [profiles, setProfiles] = useState<Profile[]>(seedProfiles)
  const [activeId, setActiveId] = useState(1)
  const activeProfile = profiles.find((profile) => profile.id === activeId) || profiles[0]
  const [draft, setDraft] = useState<Profile>(activeProfile)

  const matches = useMemo(() => {
    return sampleProperties.map((property) => ({ property, match: scoreProperty(property, draft) })).sort((a, b) => b.match.score - a.match.score)
  }, [draft])

  const strongMatches = matches.filter((item) => item.match.score >= 80)
  const averageScore = Math.round(matches.reduce((sum, item) => sum + item.match.score, 0) / matches.length)

  function selectProfile(profile: Profile) {
    setActiveId(profile.id)
    setDraft(profile)
  }

  function saveProfile() {
    setProfiles((current) => current.map((profile) => profile.id === draft.id ? draft : profile))
    setActiveId(draft.id)
  }

  function createProfile() {
    const newProfile: Profile = {
      ...draft,
      id: Date.now(),
      name: 'New Criteria Profile',
      description: 'Define a new acquisition strategy.',
    }
    setProfiles((current) => [newProfile, ...current])
    setActiveId(newProfile.id)
    setDraft(newProfile)
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

          <Link href="/" className="tab w-full"><ArrowLeft className="h-4 w-4" /> Acquisition Engine</Link>
          <div className="tab tab-active mt-1 w-full"><Target className="h-4 w-4" /> Criteria Engine</div>

          <div className="mt-8 rounded-3xl border border-[#C59A42]/25 bg-black/15 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C59A42]">Acquisition logic</p>
            <h2 className="mt-2 text-lg font-semibold">Profile-based matching</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">Define what Equinox wants, then rank each commercial opportunity against the target.</p>
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
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-[#08264A] md:text-5xl">Acquisition Criteria Engine</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60 md:text-base">Create acquisition profiles, set target property criteria, and preview how commercial properties rank against Equinox strategy.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={createProfile} className="btn btn-ghost flex items-center gap-2"><Plus className="h-4 w-4" /> New profile</button>
                    <button onClick={saveProfile} className="btn btn-primary flex items-center gap-2 bg-[#08264A]"><Save className="h-4 w-4" /> Save criteria</button>
                  </div>
                </div>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-4">
              <Stat label="Criteria profiles" value={String(profiles.length)} icon={SlidersHorizontal} />
              <Stat label="Strong matches" value={String(strongMatches.length)} icon={CheckCircle2} />
              <Stat label="Average score" value={`${averageScore}%`} icon={Gauge} />
              <Stat label="Active profile" value={draft.name} icon={Target} small />
            </section>

            <section className="grid gap-6 xl:grid-cols-[280px_1fr_390px]">
              <div className="card h-fit">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="label">Saved profiles</p>
                    <h2 className="mt-1 text-xl font-black text-[#08264A]">Strategies</h2>
                  </div>
                  <DatabaseZap className="h-5 w-5 text-[#C59A42]" />
                </div>
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <button key={profile.id} onClick={() => selectProfile(profile)} className={`w-full rounded-2xl border p-3 text-left transition ${profile.id === draft.id ? 'border-[#C59A42]/50 bg-[#C59A42]/10' : 'border-black/10 bg-white/60 hover:bg-white'}`}>
                      <p className="font-black text-[#08264A]">{profile.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/55">{profile.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="mb-5">
                  <p className="label">Criteria builder</p>
                  <h2 className="mt-1 text-2xl font-black text-[#08264A]">Target acquisition profile</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Profile name">
                    <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </Field>
                  <Field label="Description">
                    <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                  </Field>
                </div>

                <Divider title="Asset type" icon={Warehouse} />
                <ChipGrid options={propertyTypes} selected={draft.propertyTypes} onToggle={(item) => setDraft({ ...draft, propertyTypes: toggleItem(draft.propertyTypes, item) })} />

                <Divider title="Target states" icon={MapPin} />
                <ChipGrid options={states} selected={draft.states} onToggle={(item) => setDraft({ ...draft, states: toggleItem(draft.states, item) })} />

                <Divider title="Commercial rules" icon={CircleDollarSign} />
                <div className="grid gap-4 md:grid-cols-2">
                  <NumberField label="Minimum price" value={draft.minPrice} onChange={(value) => setDraft({ ...draft, minPrice: value })} prefix="$" />
                  <NumberField label="Maximum price" value={draft.maxPrice} onChange={(value) => setDraft({ ...draft, maxPrice: value })} prefix="$" />
                  <NumberField label="Minimum yield %" value={draft.minYield} onChange={(value) => setDraft({ ...draft, minYield: value })} suffix="%" />
                  <NumberField label="Minimum WALE years" value={draft.minWale} onChange={(value) => setDraft({ ...draft, minWale: value })} suffix="yrs" />
                  <NumberField label="Minimum land size" value={draft.minLandSize} onChange={(value) => setDraft({ ...draft, minLandSize: value })} suffix="m²" />
                  <NumberField label="Minimum building size" value={draft.minBuildingSize} onChange={(value) => setDraft({ ...draft, minBuildingSize: value })} suffix="m²" />
                </div>

                <Divider title="Zoning" icon={Building2} />
                <ChipGrid options={zoningOptions} selected={draft.zoning} onToggle={(item) => setDraft({ ...draft, zoning: toggleItem(draft.zoning, item) })} />

                <label className="mt-5 flex items-center gap-3 rounded-2xl border border-black/10 bg-white/65 p-4">
                  <input type="checkbox" checked={draft.requireFullOccupancy} onChange={(e) => setDraft({ ...draft, requireFullOccupancy: e.target.checked })} className="h-5 w-5 accent-[#C59A42]" />
                  <div>
                    <p className="font-black text-[#08264A]">Require 100% occupancy</p>
                    <p className="text-sm text-black/55">Useful for core income strategies. Turn off for value-add or development strategies.</p>
                  </div>
                </label>
              </div>

              <aside className="space-y-6">
                <div className="card">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="label">Live preview</p>
                      <h2 className="mt-1 text-2xl font-black text-[#08264A]">Match ranking</h2>
                    </div>
                    <Sparkles className="h-6 w-6 text-[#C59A42]" />
                  </div>
                  <div className="space-y-3">
                    {matches.map(({ property, match }) => (
                      <div key={property.id} className="rounded-3xl border border-black/10 bg-white/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-[#08264A]">{property.name}</p>
                            <p className="mt-1 text-xs text-black/55">{property.state} • {property.type} • {money(property.price)}</p>
                          </div>
                          <div className="rounded-2xl bg-[#C59A42]/15 px-3 py-2 text-center">
                            <p className="text-lg font-black text-[#08264A]">{match.score}%</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-black/45">{match.grade}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <Mini label="Yield" value={`${property.yieldPct}%`} />
                          <Mini label="Land" value={`${property.landSize.toLocaleString()}m²`} />
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {match.positives[0] || 'Strong fit'}</p>
                          <p className="flex items-center gap-2 text-xs text-red-700"><XCircle className="h-3.5 w-3.5" /> {match.negatives[0] || 'No major weakness'}</p>
                        </div>
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

function Stat({ label, value, icon: Icon, small }: { label: string; value: string; icon: any; small?: boolean }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">{label}</p>
          <p className={`mt-2 font-black text-[#08264A] ${small ? 'truncate text-xl' : 'text-3xl'}`}>{value}</p>
        </div>
        <div className="rounded-2xl bg-[#C59A42]/15 p-3 text-[#C59A42]"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-black/45">{label}</p>{children}</label>
}

function Divider({ title, icon: Icon }: { title: string; icon: any }) {
  return <div className="mb-3 mt-6 flex items-center gap-2"><Icon className="h-4 w-4 text-[#C59A42]" /><h3 className="font-black text-[#08264A]">{title}</h3></div>
}

function ChipGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} onClick={() => onToggle(option)} className={`rounded-full border px-3 py-2 text-sm font-bold transition ${selected.includes(option) ? 'border-[#C59A42]/50 bg-[#C59A42]/15 text-[#08264A]' : 'border-black/10 bg-white/60 text-black/55 hover:bg-white'}`}>{option}</button>)}</div>
}

function NumberField({ label, value, onChange, prefix, suffix }: { label: string; value: number; onChange: (value: number) => void; prefix?: string; suffix?: string }) {
  return (
    <label>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-black/45">{label}</p>
      <div className="flex items-center rounded-xl border border-black/10 bg-white/80 px-3 focus-within:ring-2 focus-within:ring-gold/40">
        {prefix && <span className="text-sm font-bold text-black/40">{prefix}</span>}
        <input className="w-full bg-transparent px-2 py-2 text-sm outline-none" type="number" value={value} onChange={(e) => onChange(Number(e.target.value || 0))} />
        {suffix && <span className="text-sm font-bold text-black/40">{suffix}</span>}
      </div>
    </label>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-black/10 bg-[#F7F2EA]/60 p-2"><p className="text-[10px] uppercase tracking-[0.16em] text-black/40">{label}</p><p className="font-black text-[#08264A]">{value}</p></div>
}
