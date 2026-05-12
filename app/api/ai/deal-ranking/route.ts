import { NextResponse } from "next/server"
import { buildInstitutionalDealSummary, rankDeal } from "@/lib/operational-intelligence"

export async function POST(request: Request) {
  const property = await request.json().catch(() => null)

  if (!property) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const ranking = rankDeal(property)
  const summary = buildInstitutionalDealSummary(property)

  return NextResponse.json({
    ok: true,
    ranking,
    executive_summary: summary,
    dd_focus: [
      "Confirm lease expiry profile and rent review structure",
      "Review zoning, flood mapping, and environmental exposure",
      "Validate passing income against rent roll and lease documents",
      "Assess logistics access, truck manoeuvrability, and site coverage",
    ],
  })
}
