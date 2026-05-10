'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, ChartNoAxesCombined, DatabaseZap, MapPin, ShieldCheck, Target } from 'lucide-react'
import { m2, seedListings, shortMoney, type Listing } from '@/lib/mock-data'
import { fetchProperties, isLiveSupabaseEnabled } from '@/lib/properties'

export default function DashboardClient() {
  const [properties, setProperties] = useState<Listing[]>(seedListings)
  const [mode, setMode] = useState(isLiveSupabaseEnabled() ? 'Supabase Live' : 'Local Mode')

  useEffect(() => {
    let active = true
    async function load() {
      if (!isLiveSupabaseEnabled()) return
      try {
        const live = await fetchProperties()
        if (active) setProperties(live)
      } catch (err) {
        console.error(err)
        if (active) setMode('Supabase needs table check')
      }
    }
    load()
    return () => { active = false }
  }, [])

  const metrics = useMemo(() => {
    const totalValue = properties.reduce((sum, item) => sum + item.price, 0)
    const avgScore = properties.length ? Math.round(properties.reduce((sum, item) => sum + item.score, 0) / properties.length) : 0
    const topDeals = properties.filter((item) => item.score >= 78).length
    return { totalValue, avgScore, topDeals }
  }, [properties])

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="stat-card"><p className="label">Tracked Value</p><h3 className="mt-2 text-3xl font-black text-[#08264A]">{shortMoney(metrics.totalValue)}</h3><p className="mt-2 text-sm text-black/55">Current acquisition pipeline</p></div>
        <div className="stat-card"><p className="label">Avg Match</p><h3 className="mt-2 text-3xl font-black text-[#08264A]">{metrics.avgScore}%</h3><p className="mt-2 text-sm text-black/55">Against core criteria</p></div>
        <div className="stat-card"><p className="label">A-Grade Leads</p><h3 className="mt-2 text-3xl font-black text-[#08264A]">{metrics.topDeals}</h3><p className="mt-2 text-sm text-black/55">Ready for deeper review</p></div>
        <div className="stat-card"><p className="label">Database</p><h3 className="mt-2 text-2xl font-black text-[#08264A]">{mode}</h3><p className="mt-2 text-sm text-black/55">v5 persistence layer</p></div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {[
          ['Acquisition Engine', Target, 'Mark new opportunities and push them into the acquisition pipeline.', '/acquisitions'],
          ['Criteria Engine', ShieldCheck, 'Create buying profiles and match deals against Equinox targets.', '/criteria'],
          ['Property Feed', Building2, 'Central source of property records, agents, scores and listing data.', '/properties'],
          ['Map Intelligence', MapPin, 'Visualise opportunities across Australia with clustering and overlays later.', '/map'],
          ['Deal Pipeline', ChartNoAxesCombined, 'Track each asset from new lead through settlement or passed.', '/pipeline'],
          ['Supabase Live', DatabaseZap, 'Properties can now save, load and delete from Supabase.', '/settings'],
        ].map(([title, Icon, text, href]) => (
          <Link href={href as string} key={title as string} className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-xl shadow-[#08264A]/5 backdrop-blur transition hover:-translate-y-0.5 hover:border-[#C59A42]/40">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08264A] text-[#C59A42]"><Icon className="h-6 w-6" /></div>
            <h3 className="text-xl font-black text-[#08264A]">{title as string}</h3>
            <p className="mt-2 text-sm leading-6 text-black/60">{text as string}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-xl shadow-[#08264A]/5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-black text-[#08264A]">Top Acquisition Signals</h3><span className="pill border-[#C59A42]/30 bg-[#C59A42]/10 text-[#8A6728]">{mode}</span></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {properties.slice(0, 2).map((item) => (
            <Link href={`/properties/${item.id}`} key={item.id} className="rounded-3xl border border-black/10 bg-white/80 p-5 transition hover:border-[#C59A42]/40">
              <div className="flex items-start justify-between gap-4"><div><h4 className="font-black text-[#08264A]">{item.title}</h4><p className="mt-1 text-sm text-black/55">{item.address} · {item.agent}</p></div><span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">{item.score}%</span></div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="label">Price</p><p className="font-bold">{shortMoney(item.price)}</p></div><div><p className="label">Yield</p><p className="font-bold">{item.yieldPct}%</p></div><div><p className="label">Land</p><p className="font-bold">{m2(item.landSize)}</p></div></div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
