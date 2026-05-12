'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BrainCircuit, CheckCircle2, ChevronRight, ShieldCheck, Target, TrendingUp, Zap } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { fetchProperties, updatePropertyStage } from '@/lib/properties'
import { m2, money, type Listing } from '@/lib/mock-data'
import { buildPriorityQueue, buildAnalystBrief } from '@/lib/autonomous-acquisition'

export default function PriorityQueuePage() {
  const [properties, setProperties] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function refresh() {
    const rows = await fetchProperties()
    setProperties(rows)
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const queue = useMemo(() => buildPriorityQueue(properties), [properties])
  const immediate = queue.filter((item) => item.urgency === 'Immediate Review')
  const highConfidence = queue.filter((item) => item.confidence === 'High')
  const monitor = queue.filter((item) => item.urgency === 'Monitor')

  async function move(property: Listing, stage: string) {
    setProperties((current) => current.map((item) => String(item.id) === String(property.id) ? { ...item, status: stage } : item))
    setMessage(`${property.title} moved to ${stage}.`)
    try { await updatePropertyStage(property.id, stage) } catch {}
  }

  return (
    <AppShell title="Priority Queue" eyebrow="Autonomous Acquisition Assistant" description="AI-ranked acquisition priorities based on match strength, urgency, risk signals and data completeness.">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Priority deals" value={queue.length} />
            <Metric label="Immediate review" value={immediate.length} />
            <Metric label="High confidence" value={highConfidence.length} />
            <Metric label="Monitor" value={monitor.length} />
          </div>

          {message ? <div className="rounded-3xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-4 text-sm font-bold text-[#08264A]">{message}</div> : null}

          <div className="space-y-4">
            {queue.map((item, index) => {
              const brief = buildAnalystBrief(item.property)
              return (
                <article key={String(item.property.id)} className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#08264A] px-3 py-1 text-xs font-black text-[#F5D58A]">#{index + 1}</span>
                        <span className="rounded-full bg-[#C59A42]/15 px-3 py-1 text-xs font-black text-[#08264A]">{item.urgency}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-black/60 ring-1 ring-black/10">{item.confidence} confidence</span>
                      </div>
                      <h3 className="mt-3 text-2xl font-black text-[#08264A]">{item.property.title}</h3>
                      <p className="mt-1 text-sm text-black/55">{item.property.address} · {item.property.type}</p>
                    </div>
                    <div className="rounded-3xl bg-[#08264A] p-4 text-center text-white">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#F5D58A]">Priority</p>
                      <p className="text-4xl font-black">{item.priorityScore}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <Mini label="Price" value={money(item.property.price)} />
                    <Mini label="Yield" value={`${item.property.yieldPct || 0}%`} />
                    <Mini label="Land" value={m2(item.property.landSize)} />
                    <Mini label="WALE" value={`${item.property.leaseYears || 0} yrs`} />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-emerald-900"><CheckCircle2 className="h-4 w-4" /><p className="text-sm font-black">Why it ranks</p></div>
                      <ul className="space-y-2 text-sm leading-5 text-emerald-950/75">{item.reasons.length ? item.reasons.map((reason) => <li key={reason}>• {reason}</li>) : <li>• Strongest available match based on current criteria.</li>}</ul>
                    </div>
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4" /><p className="text-sm font-black">DD focus</p></div>
                      <ul className="space-y-2 text-sm leading-5 text-amber-950/75">{brief.ddFocus.slice(0, 3).map((risk) => <li key={risk}>• {risk}</li>)}</ul>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-4">
                    <div className="mb-2 flex items-center gap-2 text-[#08264A]"><BrainCircuit className="h-4 w-4" /><p className="text-sm font-black">AI deal analyst</p></div>
                    <p className="text-sm leading-6 text-black/65">{brief.executiveSummary}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => move(item.property, 'Shortlisted')} className="gold-button">Shortlist <ChevronRight className="h-4 w-4" /></button>
                    <button onClick={() => move(item.property, 'Underwriting')} className="rounded-2xl bg-[#08264A] px-4 py-3 text-sm font-black text-[#F5D58A]">Underwrite</button>
                    <button onClick={() => move(item.property, 'Review Later')} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#08264A]">Review later</button>
                    <button onClick={() => move(item.property, 'Passed')} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">Pass</button>
                  </div>
                </article>
              )
            })}
            {!loading && !queue.length ? <div className="rounded-[2rem] border border-white/70 bg-white/75 p-10 text-center text-black/55">No priority opportunities yet. Import or add properties first.</div> : null}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="flex items-center gap-2 text-[#08264A]"><TrendingUp className="h-5 w-5 text-[#C59A42]" /><h3 className="text-xl font-black">Queue Logic</h3></div>
            <p className="mt-3 text-sm leading-6 text-black/60">Priority ranking blends criteria match, AI opportunity signals, risk flags and data completeness to surface the most actionable opportunities first.</p>
          </div>
          <div className="rounded-[2rem] border border-[#C59A42]/25 bg-[#08264A] p-5 text-white shadow-xl shadow-[#08264A]/20">
            <div className="flex items-center gap-2 text-[#F5D58A]"><ShieldCheck className="h-5 w-5" /><h3 className="text-xl font-black">Next Best Action</h3></div>
            <p className="mt-3 text-sm leading-6 text-white/70">Work from top to bottom: shortlist high-confidence assets, underwrite immediate-review opportunities, and pass low-fit deals quickly.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C59A42]">{label}</p><p className="mt-2 text-3xl font-black text-[#08264A]">{value}</p></div> }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-3xl border border-black/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">{label}</p><p className="mt-1 font-black text-[#08264A]">{value}</p></div> }
