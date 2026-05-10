import AppShell from '@/components/AppShell'
import { pipelineStages, seedListings, statusClass } from '@/lib/mock-data'

export default function PipelinePage() {
  return (
    <AppShell title="Deal Pipeline" eyebrow="Acquisition Workflow" description="Track every opportunity from first lead through underwriting, negotiation, settlement or passed.">
      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {pipelineStages.map((stage) => {
          const deals = seedListings.filter((item) => item.status === stage)
          return (
            <div key={stage} className="rounded-[1.75rem] border border-white/70 bg-white/70 p-4 shadow-xl shadow-[#08264A]/5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between"><h3 className="font-black text-[#08264A]">{stage}</h3><span className="pill border-black/10 bg-white text-black/60">{deals.length}</span></div>
              <div className="space-y-3">
                {deals.length ? deals.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-black/10 bg-white/85 p-4">
                    <span className={`pill ${statusClass(item.status)}`}>{item.status}</span>
                    <h4 className="mt-3 font-black text-[#08264A]">{item.title}</h4>
                    <p className="mt-1 text-sm text-black/55">{item.address}</p>
                    <p className="mt-3 text-sm font-bold text-[#C59A42]">{item.score}% match</p>
                  </div>
                )) : <p className="rounded-3xl border border-dashed border-black/15 p-4 text-sm text-black/45">No deals in this stage yet.</p>}
              </div>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
