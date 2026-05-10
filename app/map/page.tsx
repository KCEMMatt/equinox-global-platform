import AppShell from '@/components/AppShell'
import { MapPin } from 'lucide-react'
import { seedListings } from '@/lib/mock-data'

export default function MapPage() {
  return (
    <AppShell title="Map Intelligence" eyebrow="Australia Deal Map" description="A working map module placeholder. Next we can connect Mapbox and Supabase property coordinates.">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-white/70 bg-[#08264A] p-6 shadow-xl shadow-[#08264A]/15">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(197,154,66,.28),transparent_25%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,.12),transparent_30%)]" />
          <div className="relative z-10 flex h-full items-center justify-center text-center text-white">
            <div>
              <MapPin className="mx-auto h-16 w-16 text-[#C59A42]" />
              <h3 className="mt-4 text-3xl font-black">Mapbox Ready Zone</h3>
              <p className="mx-auto mt-3 max-w-xl text-white/65">This page is wired into navigation. The next build can render actual property markers, clustering and gold high-opportunity pins.</p>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-[#08264A]/5 backdrop-blur">
          <h3 className="text-xl font-black text-[#08264A]">Map Listings</h3>
          <div className="mt-4 space-y-3">
            {seedListings.map((item) => <div key={item.id} className="rounded-3xl border border-black/10 bg-white/80 p-4"><p className="font-bold text-[#08264A]">{item.address}</p><p className="text-sm text-black/55">{item.score}% match · {item.type}</p></div>)}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
