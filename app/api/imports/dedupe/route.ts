import { NextResponse } from "next/server"
import { calculateDuplicateConfidence } from "@/lib/operational-intelligence"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const result = calculateDuplicateConfidence(body.address_a, body.address_b)

  return NextResponse.json({
    ok: true,
    ...result,
  })
}
