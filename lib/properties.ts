import { seedListings, type Listing } from './mock-data'

export type PropertyInput = Omit<Listing, 'id' | 'score'> & {
  score?: number
  zoning?: string
  occupancy?: number
  sourceUrl?: string
  imageUrl?: string
}

export const STORAGE_KEY = 'egp_properties_v1'

export function calculatePropertyScore(property: Partial<PropertyInput>) {
  let score = 45

  if ((property.yieldPct || 0) >= 7) score += 18
  else if ((property.yieldPct || 0) >= 6.5) score += 14
  else if ((property.yieldPct || 0) >= 6) score += 8

  if ((property.landSize || 0) >= 6000) score += 12
  else if ((property.landSize || 0) >= 3500) score += 8

  if ((property.buildingSize || 0) >= 2000) score += 10
  else if ((property.buildingSize || 0) >= 1200) score += 6

  if ((property.leaseYears || 0) >= 4) score += 10
  else if ((property.leaseYears || 0) >= 2.5) score += 6

  if (property.state === 'QLD') score += 5
  if ((property.notes || '').toLowerCase().includes('flood')) score -= 12
  if ((property.notes || '').toLowerCase().includes('vacant')) score -= 8
  if ((property.notes || '').toLowerCase().includes('m1') || (property.notes || '').toLowerCase().includes('motorway')) score += 6

  return Math.max(0, Math.min(99, Math.round(score)))
}

export function createProperty(input: PropertyInput, existing: Listing[]) {
  return {
    id: Date.now(),
    score: input.score || calculatePropertyScore(input),
    ...input,
  } satisfies Listing
}

export function getInitialProperties() {
  return seedListings
}
