import AppShell from '@/components/AppShell'
import { Building2, ChartNoAxesCombined, DatabaseZap, MapPin, ShieldCheck, Target } from 'lucide-react'
import { m2, seedListings, shortMoney } from '@/lib/mock-data'

export default function DashboardPage() {
  const totalValue = seedListings.reduce((sum, item) => sum + item.price, 0)
  const avgScore = Math.round(seedListings.reduce((sum, item) => sum + item.score, 0) / seedListings.length)
  const topDeals = seedListings.filter((item) => item.score >= 78).length

  return (
    <AppShell
      title="Command Dashboard"
      description="A central operating platform for acquisitions, criteria matching, property intelligence and future Equinox tools."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="stat-card"><p className="label">Tracked Value</p><h3 className="mt-2 text-3xl font-black text-[#08264A]">{shortMoney(totalValue)}</h3><p className="mt-2 text-sm text-black/55">Current sample pipeline</p></div>
        <div className="stat-card"><p className="label">Avg Match</p><h3 className="mt-2 text-3xl font-black text-[#08264A]">{avgScore}%</h3><p className="mt-2 text-sm text-black/55">Against core criteria</p></div>
        <div className="stat-card"><p className="label">A-Grade Leads</p><h3 className="mt-2 text-3xl font-black text-[#08264A]">{topDeals}</h3><p className="mt-2 text-sm text-black/55">Ready for deeper review</p></div>
        <div className="stat-card"><p className="label">Active Modules</p><h3 className="mt-2 text-3xl font-black text-[#08264A]">6</h3><p className="mt-2 text-sm text-black/55">Navigation now live</p></div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {[
          ['Acquisition Engine', Target, 'Mark new opportunities and push them into the acquisition pipeline.'],
          ['Criteria Engine', ShieldCheck, 'Create buying profiles and match deals against Equinox targets.'],
          ['Property Feed', Building2, 'Central source of property records, agents, scores and listing data.'],
          ['Map Intelligence', MapPin, 'Visualise opportunities across Australia with clustering and overlays later.'],
          ['Deal Pipeline', ChartNoAxesCombined, 'Track each asset from new lead through settlement or passed.'],
          ['Supabase Ready', DatabaseZap, 'Database tables are prepared for saving profiles and properties.'],
        ].map(([title, Icon, text]) => (
          <div key={title as string} className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08264A] text-[#C59A42]"><Icon className="h-6 w-6" /></div>
            <h3 className="text-xl font-black text-[#08264A]">{title as string}</h3>
            <p className="mt-2 text-sm leading-6 text-black/60">{text as string}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-xl shadow-[#08264A]/5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-black text-[#08264A]">Top Acquisition Signals</h3><span className="pill border-[#C59A42]/30 bg-[#C59A42]/10 text-[#8A6728]">Live prototype data</span></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {seedListings.slice(0, 2).map((item) => (
            <div key={item.id} className="rounded-3xl border border-black/10 bg-white/80 p-5">
              <div className="flex items-start justify-between gap-4"><div><h4 className="font-black text-[#08264A]">{item.title}</h4><p className="mt-1 text-sm text-black/55">{item.address} · {item.agent}</p></div><span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">{item.score}%</span></div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="label">Price</p><p className="font-bold">{shortMoney(item.price)}</p></div><div><p className="label">Yield</p><p className="font-bold">{item.yieldPct}%</p></div><div><p className="label">Land</p><p className="font-bold">{m2(item.landSize)}</p></div></div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
