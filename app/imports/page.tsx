'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Import, Play, RefreshCcw, Search, Zap } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { fetchScheduledImportJobs, type ScheduledImportJob } from '@/lib/autonomous-acquisition'
import { fetchImportedListings, fetchSourceSearches, getImportHealth, type ImportedListing, type SourceSearch } from '@/lib/acquisition-engine'

export default function ImportsPage() {
  const [jobs, setJobs] = useState<ScheduledImportJob[]>([])
  const [sources, setSources] = useState<SourceSearch[]>([])
  const [imports, setImports] = useState<ImportedListing[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [jobRows, sourceRows, importRows] = await Promise.all([fetchScheduledImportJobs(), fetchSourceSearches(), fetchImportedListings(50)])
    setJobs(jobRows)
    setSources(sourceRows)
    setImports(importRows)
  }

  useEffect(() => { refresh() }, [])
  const health = getImportHealth(sources, imports)

  async function runScheduled() {
    setBusy(true)
    setMessage('Running scheduled import cycle...')
    try {
      const res = await fetch('/api/run-scheduled-imports', { method: 'POST' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Scheduled import failed')
      setMessage(`Import cycle completed. ${json.processed || 0} source(s) processed.`)
      await refresh()
    } catch (error: any) {
      setMessage(error?.message || 'Import cycle failed. Check API route and source configuration.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title="Import Control" eyebrow="Autonomous Import Scheduler" description="Monitor saved sources, scheduled import jobs, webhook imports, duplicates and source health.">
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Active jobs" value={jobs.filter((j) => j.active).length} />
            <Metric label="Active sources" value={health.activeSources} />
            <Metric label="Imported today" value={health.importedToday} />
            <Metric label="Failed imports" value={health.failedImports} />
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="label text-[#C59A42]">Scheduler</p><h3 className="text-2xl font-black text-[#08264A]">Autonomous import cycle</h3><p className="mt-2 text-sm leading-6 text-black/55">Use this while cron scheduling is being finalised. Later, Vercel Cron, Supabase Cron or Apify schedules can call the same endpoint automatically.</p></div>
              <button onClick={runScheduled} disabled={busy} className="gold-button"><Play className="h-4 w-4" />Run Cycle</button>
            </div>
            {message ? <p className="mt-4 rounded-2xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-3 text-sm font-bold text-[#08264A]">{message}</p> : null}
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <div className="mb-4 flex items-center gap-2 text-[#08264A]"><CalendarClock className="h-5 w-5 text-[#C59A42]" /><h3 className="text-2xl font-black">Scheduled Jobs</h3></div>
            <div className="space-y-3">
              {jobs.map((job) => <div key={job.id} className="rounded-3xl border border-black/10 bg-white p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-black text-[#08264A]">{job.source_name || 'Saved source'}</p><p className="mt-1 text-sm text-black/55">Every {job.frequency_minutes} minutes · {job.active ? 'Active' : 'Paused'}</p></div><span className="rounded-full bg-[#F5F0E8] px-3 py-1 text-xs font-black text-[#08264A]">{job.last_status || 'pending'}</span></div>{job.last_error ? <p className="mt-2 text-xs text-red-600">{job.last_error}</p> : null}</div>)}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-[#C59A42]/25 bg-[#08264A] p-5 text-white shadow-xl shadow-[#08264A]/20">
            <div className="flex items-center gap-2 text-[#F5D58A]"><Import className="h-5 w-5" /><h3 className="text-xl font-black">Level 3 Ready</h3></div><p className="mt-3 text-sm leading-6 text-white/70">External scrapers can post normalized listings into <span className="font-mono text-[#F5D58A]">/api/apify-webhook</span>. The same duplicate detection, scoring and review workflow is used.</p>
          </div>
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5"><div className="flex items-center gap-2 text-[#08264A]"><Zap className="h-5 w-5 text-[#C59A42]" /><h3 className="text-xl font-black">Import Health</h3></div><div className="mt-4 space-y-3"><Health label="Checked sources" value={`${health.checkedSources}/${health.totalSources}`} /><Health label="Duplicates" value={health.duplicates} /><Health label="Review required" value={health.reviewRequired} /><Health label="Last checked" value={health.lastChecked} /></div></div>
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5"><div className="flex items-center gap-2 text-[#08264A]"><Search className="h-5 w-5 text-[#C59A42]" /><h3 className="text-xl font-black">Recent Imports</h3></div><div className="mt-4 space-y-3">{imports.slice(0, 5).map((item) => <div key={item.id} className="rounded-2xl border border-black/10 bg-white p-3"><p className="text-sm font-black text-[#08264A]">{item.rawTitle || item.rawAddress || item.sourceName || 'Imported listing'}</p><p className="text-xs text-black/50">{item.importStatus}</p></div>)}{!imports.length ? <p className="text-sm text-black/50">No import history yet.</p> : null}</div></div>
        </aside>
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C59A42]">{label}</p><p className="mt-2 text-3xl font-black text-[#08264A]">{value}</p></div> }
function Health({ label, value }: { label: string; value: string | number }) { return <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-3"><span className="text-sm text-black/55">{label}</span><span className="font-black text-[#08264A]">{value}</span></div> }
