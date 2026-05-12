import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function getOrigin(request: Request) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

async function runImports(request: Request) {
  if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 400 })

  const startedAt = new Date().toISOString()
  const { data: sources, error } = await supabase
    .from('source_searches')
    .select('*')
    .eq('active', true)
    .limit(10)

  if (error) throw error

  const origin = getOrigin(request)
  const results: any[] = []

  for (const source of sources || []) {
    if (!source.source_url) continue
    try {
      const response = await fetch(`${origin}/api/import-source`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceSearchId: source.id, url: source.source_url, mode: source.import_mode || 'saved_search' }),
      })
      const json = await response.json()
      results.push({ sourceId: source.id, sourceName: source.name, ok: Boolean(json.ok), result: json })
      await supabase.from('source_searches').update({ last_checked_at: new Date().toISOString(), last_error: json.ok ? null : json.error || 'Import failed' }).eq('id', source.id)
    } catch (err: any) {
      results.push({ sourceId: source.id, sourceName: source.name, ok: false, error: err?.message || 'Import failed' })
      await supabase.from('source_searches').update({ last_checked_at: new Date().toISOString(), last_error: err?.message || 'Import failed' }).eq('id', source.id)
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

  return NextResponse.json({ ok: true, checked: results.length, successful, failed, results })
}

export async function POST(request: Request) {
  try { return await runImports(request) } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || 'Scheduled import failed' }, { status: 500 }) }
}

export async function GET(request: Request) {
  try { return await runImports(request) } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || 'Scheduled import failed' }, { status: 500 }) }
}
