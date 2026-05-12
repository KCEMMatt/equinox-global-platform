import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  if (!supabase) {
    return NextResponse.json({
      ok: true,
      mode: "local-preview",
      message: "Supabase keys not configured. Payload received but not saved.",
      received: body,
    })
  }

  const sourceName = body.source_name || body.sourceName || "External Import"
  const sourceUrl = body.source_url || body.sourceUrl || body.url || ""

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      source_name: sourceName,
      source_url: sourceUrl,
      status: "imported",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      records_imported: Array.isArray(body.listings) ? body.listings.length : 1,
    })
    .select()
    .single()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  const listings = Array.isArray(body.listings) ? body.listings : [body]

  const rows = listings.map((listing: any) => ({
    import_job_id: job.id,
    external_id: listing.external_id || listing.id || null,
    source_name: sourceName,
    source_url: listing.source_url || listing.url || sourceUrl,
    raw_title: listing.title || listing.raw_title || null,
    raw_address: listing.address || listing.raw_address || null,
    raw_price: listing.price || listing.raw_price || null,
    raw_data: listing,
    import_status: "review_required",
  }))

  const { error } = await supabase.from("imported_listings").insert(rows)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, import_job_id: job.id, imported: rows.length })
}
