import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Operational import runner ready. Connect source_searches to Apify actors or custom adapters next.",
    next_steps: [
      "Load active source_searches",
      "Trigger source adapter",
      "Receive results via /api/imports/webhook",
      "Run dedupe",
      "Run AI enrichment",
      "Push to priority queue",
    ],
  })
}
