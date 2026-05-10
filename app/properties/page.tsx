import AppShell from '@/components/AppShell'
import { m2, money, scoreLabel, seedListings, statusClass } from '@/lib/mock-data'

export default function PropertiesPage() {
  return (
    <AppShell title="Property Feed" eyebrow="Acquisition Intelligence" description="A central feed for commercial opportunities, scores, agents and deal notes.">
      <div className="space-y-4">
        {seedListings.map((item) => (
          <div key={item.id} className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap gap-2"><span className={`pill ${statusClass(item.status)}`}>{item.status}</span><span className="pill border-[#C59A42]/30 bg-[#C59A42]/10 text-[#8A6728]">{scoreLabel(item.score)}</span></div>
                <h3 className="text-2xl font-black text-[#08264A]">{item.title}</h3>
                <p className="mt-1 text-sm text-black/60">{item.address} · {item.agent} · {item.source}</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">{item.notes}</p>
              </div>
              <div className="rounded-3xl bg-[#08264A] px-5 py-4 text-center text-white"><p className="text-xs uppercase tracking-[0.2em] text-[#C59A42]">Match</p><p className="text-3xl font-black">{item.score}%</p></div>
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
    </AppShell>
  )
}
