export type ImportedListingPayload = {
  source_name?: string
  source_url?: string
  external_id?: string
  raw_title?: string
  raw_address?: string
  raw_price?: string
  raw_data?: Record<string, unknown>
}

export type DedupeResult = {
  duplicate: boolean
  confidence: number
  reason: string
}

export function normalizeAddress(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function calculateDuplicateConfidence(a?: string | null, b?: string | null): DedupeResult {
  const left = normalizeAddress(a)
  const right = normalizeAddress(b)

  if (!left || !right) {
    return { duplicate: false, confidence: 0, reason: "Insufficient address data" }
  }

  if (left === right) {
    return { duplicate: true, confidence: 98, reason: "Exact normalized address match" }
  }

  const leftParts = new Set(left.split(" "))
  const rightParts = new Set(right.split(" "))
  const leftArray = Array.from(leftParts)
  const rightArray = Array.from(rightParts)
  const intersection = leftArray.filter((part) => rightParts.has(part)).length
  const union = new Set(leftArray.concat(rightArray)).size
  const score = union ? Math.round((intersection / union) * 100) : 0

  return {
    duplicate: score >= 82,
    confidence: score,
    reason: score >= 82 ? "High-confidence address similarity" : "No strong duplicate match",
  }
}

export function rankDeal(property: {
  match_score?: number | null
  yield?: number | null
  land_size?: number | null
  logistics_score?: number | null
  market_score?: number | null
  acquisition_confidence?: number | null
}) {
  const score =
    Number(property.match_score || 0) * 0.35 +
    Math.min(Number(property.yield || 0) * 8, 25) +
    Math.min(Number(property.land_size || 0) / 500, 15) +
    Number(property.logistics_score || 0) * 0.15 +
    Number(property.market_score || 0) * 0.15 +
    Number(property.acquisition_confidence || 0) * 0.1

  if (score >= 85) return { rank: "High Conviction Opportunity", score: Math.round(score) }
  if (score >= 68) return { rank: "Moderate Conviction", score: Math.round(score) }
  if (score >= 45) return { rank: "Speculative", score: Math.round(score) }
  return { rank: "Avoid / Low Priority", score: Math.round(score) }
}

export function buildInstitutionalDealSummary(property: {
  address?: string | null
  suburb?: string | null
  state?: string | null
  property_type?: string | null
  yield?: number | null
  land_size?: number | null
  wale?: number | null
  zoning?: string | null
}) {
  const location = [property.suburb, property.state].filter(Boolean).join(", ")
  const yieldText = property.yield ? `${property.yield}% yield` : "yield yet to be confirmed"
  const landText = property.land_size ? `${property.land_size.toLocaleString()}m² land holding` : "land size yet to be confirmed"
  const waleText = property.wale ? `${property.wale} year WALE` : "lease profile requiring review"

  return `Potential ${property.property_type || "commercial"} acquisition in ${location || "target market"} with ${yieldText}, ${landText}, and ${waleText}. Review zoning, tenant covenant, logistics access, and rental reversion potential before progressing.`
}
