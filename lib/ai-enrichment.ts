import { type Listing } from './mock-data'
import { getBestMatch } from './acquisition-engine'

export type PropertyEnrichment = {
  aiSummary: string
  riskFlags: string[]
  opportunityInsights: string[]
  notificationPriority: 'low' | 'medium' | 'high'
}

function has(text: string, terms: string[]) {
  const lower = text.toLowerCase()
  return terms.some((term) => lower.includes(term.toLowerCase()))
}

export function enrichProperty(property: Listing): PropertyEnrichment {
  const match = getBestMatch(property)
  const text = `${property.title} ${property.address} ${property.type} ${property.notes}`
  const riskFlags: string[] = []
  const opportunityInsights: string[] = []

  if (property.yieldPct >= 7) opportunityInsights.push('Yield appears above target and should be prioritised for underwriting.')
  if (property.yieldPct > 0 && property.yieldPct < 6) riskFlags.push('Yield appears below core income target.')
  if (property.leaseYears > 0 && property.leaseYears < 2) riskFlags.push('Short lease term / WALE may create income risk.')
  if (property.landSize >= 6000) opportunityInsights.push('Large landholding may support future expansion, yard use, or repositioning.')
  if (property.buildingSize > 0 && property.landSize > 0 && property.buildingSize / property.landSize < 0.35) opportunityInsights.push('Low site coverage signal detected — potential expansion or hardstand angle.')
  if (has(text, ['m1', 'motorway', 'highway', 'logistics', 'transport', 'b-double'])) opportunityInsights.push('Logistics / transport access language detected.')
  if (has(text, ['flood', 'contamination', 'easement', 'asbestos'])) riskFlags.push('Risk keyword detected — complete due diligence before progressing.')
  if (has(text, ['vacant', 'vacancy', 'month to month'])) riskFlags.push('Vacancy or income instability keyword detected.')
  if (has(text, ['development', 'subdivision', 'expansion', 'stca', 'upside'])) opportunityInsights.push('Development or value-add wording detected.')

  const summaryParts = [
    `${property.title || 'This opportunity'} currently scores ${match.score}% against ${match.category.name}.`,
    match.positives.slice(0, 2).join(' '),
    opportunityInsights[0] || 'It should remain in the review workflow until key commercial metrics are verified.',
    riskFlags[0] ? `Main risk: ${riskFlags[0]}` : 'No major automated risk flag was detected from the available data.',
  ].filter(Boolean)

  return {
    aiSummary: summaryParts.join(' '),
    riskFlags,
    opportunityInsights,
    notificationPriority: match.score >= 85 ? 'high' : match.score >= 70 ? 'medium' : 'low',
  }
}

export function buildDailyAcquisitionFeed(properties: Listing[]) {
  return properties
    .map((property) => ({ property, match: getBestMatch(property), enrichment: enrichProperty(property) }))
    .filter((item) => !['Passed', 'Ignored'].includes(item.property.status))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 8)
}
