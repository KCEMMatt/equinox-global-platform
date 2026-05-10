'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Building2, Filter, Plus, Save, Search, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react'
import { m2, money, scoreLabel, seedListings, statusClass, type Listing } from '@/lib/mock-data'
import { calculatePropertyScore, deleteProperty, fetchProperties, insertProperty, isLiveSupabaseEnabled, STORAGE_KEY } from '@/lib/properties'

const emptyForm = {
  title: '',
  address: '',
  state: 'QLD',
  type: 'Industrial',
  price: '',
  landSize: '',
  buildingSize: '',
  yieldPct: '',
  leaseYears: '',
  agent: '',
  source: 'Manual Entry',
  status: 'New Lead',
  notes: '',
}

function toNumber(value: string) {
  return Number(value || 0)
}

export default function PropertiesClient() {
  const [properties, setProperties] = useState<Listing[]>(seedListings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('All')
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    let active = true

    async function loadProperties() {
      try {
        setLoading(true)
        setError('')
        if (isLiveSupabaseEnabled()) {
          const liveProperties = await fetchProperties()
          if (active) setProperties(liveProperties)
        } else {
          const saved = window.localStorage.getItem(STORAGE_KEY)
          if (active && saved) setProperties(JSON.parse(saved))
        }
      } catch (err) {
        console.error(err)
        if (active) setError('Could not load Supabase properties. Check the properties table and Vercel environment variables.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProperties()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!isLiveSupabaseEnabled()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(properties))
  }, [properties])

  const previewScore = calculatePropertyScore({
    ...form,
    price: toNumber(form.price),
    landSize: toNumber(form.landSize),
    buildingSize: toNumber(form.buildingSize),
    yieldPct: toNumber(form.yieldPct),
    leaseYears: toNumber(form.leaseYears),
  })

  const filtered = useMemo(() => {
    return properties.filter((property) => {
      const matchesState = stateFilter === 'All' || property.state === stateFilter
      const haystack = `${property.title} ${property.address} ${property.agent} ${property.notes} ${property.status}`.toLowerCase()
      return matchesState && haystack.includes(query.toLowerCase())
    })
  }, [properties, query, stateFilter])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = {
      title: form.title || 'Untitled Opportunity',
      address: form.address,
      state: form.state,
      type: form.type,
      price: toNumber(form.price),
      landSize: toNumber(form.landSize),
      buildingSize: toNumber(form.buildingSize),
      yieldPct: toNumber(form.yieldPct),
      leaseYears: toNumber(form.leaseYears),
      agent: form.agent || 'Unassigned',
      source: form.source,
      status: form.status,
      score: previewScore,
      notes: form.notes,
    }

    try {
      setError('')
      const next = await insertProperty(input)
      setProperties((current) => [next, ...current])
      setForm(emptyForm)
      setShowForm(false)
    } catch (err) {
      console.error(err)
      setError('Could not save this property to Supabase. Check the properties table columns and RLS policies.')
    }
  }

  async function handleDelete(id: string | number) {
    try {
      setError('')
      await deleteProperty(id)
      setProperties((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      console.error(err)
      setError('Could not delete this property. Check Supabase RLS delete access.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur lg:col-span-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[#C59A42]"><Building2 className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[0.24em]">Properties System v1</p></div>
              <h3 className="text-2xl font-black text-[#08264A]">Add, track and score acquisition opportunities.</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">This is the operational property database. It saves to Supabase when environment variables are connected, with local fallback for testing.</p>
            </div>
            <button onClick={() => setShowForm((value) => !value)} className="gold-button justify-center">
              <Plus className="h-4 w-4" /> Add Property
            </button>
          </div>
        </div>
        <div className="rounded-[2rem] border border-[#C59A42]/30 bg-[#08264A] p-5 text-white shadow-xl shadow-[#08264A]/15">
          <p className="text-xs uppercase tracking-[0.24em] text-[#C59A42]">{isLiveSupabaseEnabled() ? 'Supabase Live' : 'Local Mode'}</p>
          <p className="mt-3 text-4xl font-black">{properties.length}</p>
          <p className="mt-1 text-sm text-white/65">Tracked opportunities</p>
        </div>
      </div>

      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
      {loading ? <div className="rounded-3xl border border-white/70 bg-white/70 p-4 text-sm font-bold text-[#08264A]">Loading property database...</div> : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[#C59A42]/30 bg-white/85 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C59A42]">Mark Opportunity</p>
              <h3 className="text-2xl font-black text-[#08264A]">New property record</h3>
            </div>
            <div className="rounded-3xl bg-[#08264A] px-5 py-4 text-center text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-[#C59A42]">Auto Score</p>
              <p className="text-3xl font-black">{previewScore}%</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="field lg:col-span-2">Property name<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Prime Industrial Warehouse" /></label>
            <label className="field lg:col-span-2">Address / suburb<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Yatala, QLD" /></label>
            <label className="field">State<select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}><option>QLD</option><option>NSW</option><option>VIC</option><option>SA</option><option>WA</option><option>TAS</option><option>ACT</option><option>NT</option></select></label>
            <label className="field">Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Industrial</option><option>Industrial Land</option><option>Warehouse</option><option>Logistics</option><option>Hardstand</option><option>Commercial</option></select></label>
            <label className="field">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>New Lead</option><option>Reviewing</option><option>Contacted</option><option>Underwriting</option><option>DD</option><option>Negotiating</option><option>Under Contract</option><option>Settled</option><option>Passed</option></select></label>
            <label className="field">Source<input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></label>
            <label className="field">Asking price<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="3850000" /></label>
            <label className="field">Yield %<input type="number" step="0.1" value={form.yieldPct} onChange={(e) => setForm({ ...form, yieldPct: e.target.value })} placeholder="6.8" /></label>
            <label className="field">Land m²<input type="number" value={form.landSize} onChange={(e) => setForm({ ...form, landSize: e.target.value })} placeholder="4200" /></label>
            <label className="field">Building m²<input type="number" value={form.buildingSize} onChange={(e) => setForm({ ...form, buildingSize: e.target.value })} placeholder="1850" /></label>
            <label className="field">WALE / lease years<input type="number" step="0.1" value={form.leaseYears} onChange={(e) => setForm({ ...form, leaseYears: e.target.value })} placeholder="3.2" /></label>
            <label className="field">Agent<input value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })} placeholder="CBRE Industrial" /></label>
            <label className="field md:col-span-2 lg:col-span-4">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="M1 access, tenant quality, flood overlay, upside, concerns..." /></label>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/60">Cancel</button>
            <button type="submit" className="gold-button"><Save className="h-4 w-4" /> Save Property</button>
          </div>
        </form>
      ) : null}

      <div className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-xl shadow-[#08264A]/5 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px]">
          <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/60"><Search className="h-4 w-4" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search properties, agents, notes..." className="w-full bg-transparent outline-none" /></div>
          <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/60"><Filter className="h-4 w-4" /><select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="w-full bg-transparent outline-none"><option>All</option><option>QLD</option><option>NSW</option><option>VIC</option><option>SA</option><option>WA</option></select></div>
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#08264A]"><SlidersHorizontal className="h-4 w-4" /> {filtered.length} results</div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap gap-2"><span className={`pill ${statusClass(item.status)}`}>{item.status}</span><span className="pill border-[#C59A42]/30 bg-[#C59A42]/10 text-[#8A6728]">{scoreLabel(item.score)}</span></div>
                <Link href={`/properties/${item.id}`} className="text-2xl font-black text-[#08264A] hover:text-[#C59A42]">{item.title}</Link>
                <p className="mt-1 text-sm text-black/60">{item.address} · {item.agent} · {item.source}</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">{item.notes}</p>
              </div>
              <div className="flex gap-3"><div className="rounded-3xl bg-[#08264A] px-5 py-4 text-center text-white"><p className="text-xs uppercase tracking-[0.2em] text-[#C59A42]">Match</p><p className="text-3xl font-black">{item.score}%</p></div><button onClick={() => handleDelete(item.id)} className="rounded-3xl border border-red-200 bg-red-50 px-4 text-red-700 hover:bg-red-100" title="Delete property"><Trash2 className="h-5 w-5" /></button></div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <div className="card"><p className="label">Price</p><p className="font-black text-[#08264A]">{money(item.price)}</p></div>
              <div className="card"><p className="label">Yield</p><p className="font-black text-[#08264A]">{item.yieldPct}%</p></div>
              <div className="card"><p className="label">Land</p><p className="font-black text-[#08264A]">{m2(item.landSize)}</p></div>
              <div className="card"><p className="label">Building</p><p className="font-black text-[#08264A]">{m2(item.buildingSize)}</p></div>
              <div className="card"><p className="label">WALE</p><p className="font-black text-[#08264A]">{item.leaseYears} yrs</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-[#C59A42]/25 bg-[#08264A]/95 p-5 text-white shadow-xl shadow-[#08264A]/15">
        <div className="flex items-start gap-3"><Sparkles className="mt-1 h-5 w-5 text-[#C59A42]" /><div><h3 className="font-black">v5 Supabase Integration</h3><p className="mt-1 text-sm leading-6 text-white/70">Properties now load from Supabase, save new opportunities, delete records and fall back to local storage when Supabase env vars are not configured.</p></div></div>
      </div>
    </div>
  )
}
