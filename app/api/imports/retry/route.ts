import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST() {
  const supabase = getSupabase()

  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "local-preview", retried: 0 })
  }

  const { data: queue, error } = await supabase
    .from("import_retry_queue")
    .select("*")
    .lte("next_retry_at", new Date().toISOString())
    .limit(25)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    retried: queue?.length || 0,
    message: "Retry queue loaded. Connect this route to source adapters/Apify actors for production retry execution.",
  })
}
