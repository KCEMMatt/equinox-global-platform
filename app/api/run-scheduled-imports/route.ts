import { NextResponse } from 'next/server'
import { createNotification } from '@/lib/autonomous-acquisition'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function getOrigin(request: Request) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

async function runImports(request: Request) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 400 })

  const startedAt = new Date().toISOString()
  const now = new Date().toISOString()

  const { data: jobs } = await supabase
    .from('scheduled_import_jobs')
    .select('*, source_searches(*)')
    .eq('active', true)
    .or(`next_run_at.is.null,next_run_at.lte.${now}`)
    .limit(20)

  let sources = (jobs || []).map((job: any) => ({ job, source: job.source_searches })).filter((item: any) => item.source)

  if (!sources.length) {
    const { data: fallbackSources, error } = await supabase
      .from('source_searches')
      .select('*')
      .eq('active', true)
      .limit(10)
    if (error) throw error
    sources = (fallbackSources || []).map((source: any) => ({ job: null, source }))
  }

  const origin = getOrigin(request)
  const results: any[] = []

  for (const item of sources) {
    const source = item.source
    const job = item.job
    if (!source?.source_url) continue
    try {
      const response = await fetch(`${origin}/api/import-source`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceSearchId: source.id, url: source.source_url, mode: source.import_mode || 'saved_search' }),
      })
      const json = await response.json()
      results.push({ sourceId: source.id, sourceName: source.name, ok: Boolean(json.ok), result: json })
      await supabase.from('source_searches').update({ last_checked_at: new Date().toISOString(), last_error: json.ok ? null : json.error || 'Import failed' }).eq('id', source.id)
      if (job?.id) {
        const nextRun = new Date(Date.now() + Number(job.frequency_minutes || 60) * 60 * 1000).toISOString()
        await supabase.from('scheduled_import_jobs').update({ last_run_at: new Date().toISOString(), next_run_at: nextRun, last_status: json.ok ? 'success' : 'failed', last_error: json.ok ? null : json.error || 'Import failed' }).eq('id', job.id)
      }
    } catch (err: any) {
      results.push({ sourceId: source.id, sourceName: source.name, ok: false, error: err?.message || 'Import failed' })
      await supabase.from('source_searches').update({ last_checked_at: new Date().toISOString(), last_error: err?.message || 'Import failed' }).eq('id', source.id)
      if (job?.id) await supabase.from('scheduled_import_jobs').update({ last_run_at: new Date().toISOString(), last_status: 'failed', last_error: err?.message || 'Import failed' }).eq('id', job.id)
    }
  }

  const successful = results.filter((item) => item.ok).length
  const failed = results.length - successful

  await supabase.from('automation_runs').insert({
    run_type: 'scheduled_imports',
    status: failed ? 'completed_with_errors' : 'completed',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    sources_checked: results.length,
    imported_count: successful,
    failed_count: failed,
    details: { results },
  })

  if (successful || failed) {
    await createNotification({
      title: failed ? 'Import cycle completed with issues' : 'Import cycle completed',
      message: `${results.length} source(s) checked. ${successful} successful, ${failed} failed.`,
      notification_type: failed ? 'Import Warning' : 'Import Health',
    })
  }

  return NextResponse.json({ ok: true, processed: results.length, checked: results.length, successful, failed, results })
}

export async function POST(request: Request) {
  try { return await runImports(request) } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || 'Scheduled import failed' }, { status: 500 }) }
}

export async function GET(request: Request) {
  try { return await runImports(request) } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || 'Scheduled import failed' }, { status: 500 }) }
}
