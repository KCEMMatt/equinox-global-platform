import { seedListings, type Listing } from './mock-data'
import { isSupabaseConfigured, supabase } from './supabase'

export type AcquisitionCategory = {
  id: string
  name: string
  description: string
  states: string[]
  propertyTypes: string[]
  minPrice: number
  maxPrice: number
  minYield: number
  minLandSize: number
  minBuildingSize: number
  minWale: number
  mustHave?: string[]
  bonus?: string[]
}

export type SourceSearch = {
  id: string
  categoryId: string
  name: string
  source: string
  url: string
  status: string
  lastChecked: string
  newMatches: number
  importMode?: 'saved_search' | 'single_listing' | 'apify' | 'manual'
  notes?: string
}

export type ImportedListing = {
  id: string
  sourceSearchId?: string
  propertyId?: string
  sourceName: string
  sourceUrl: string
  rawTitle: string
  rawAddress: string
  rawPrice: string
  importStatus: string
  reviewNotes?: string
  createdAt?: string
  duplicateKey?: string
  duplicateOfPropertyId?: string
  confidence?: number
}

export type CategoryMatch = {
  category: AcquisitionCategory
  score: number
  grade: string
  positives: string[]
  negatives: string[]
  passed: boolean
}

export type ImportHealth = {
  totalSources: number
  activeSources: number
  checkedSources: number
  failedImports: number
  reviewRequired: number
  duplicates: number
  importedToday: number
  lastChecked: string
}

export const defaultCategories: AcquisitionCategory[] = [
  { id: 'core-industrial', name: 'Core Industrial', description: 'Stabilised industrial assets with income, clean fundamentals and strong corridor access.', states: ['QLD', 'NSW', 'VIC'], propertyTypes: ['Industrial', 'Warehouse', 'Logistics'], minPrice: 2000000, maxPrice: 15000000, minYield: 6, minLandSize: 2500, minBuildingSize: 1000, minWale: 2.5, mustHave: ['Industrial zoning', 'Tenant income'], bonus: ['M1 / motorway access', 'Low vacancy area', 'Strong tenant covenant'] },
  { id: 'value-add', name: 'Value-Add Industrial', description: 'Assets with rental upside, vacancy upside, repositioning potential or underutilised land.', states: ['QLD', 'NSW', 'VIC', 'SA', 'WA'], propertyTypes: ['Industrial', 'Industrial Land', 'Warehouse'], minPrice: 1000000, maxPrice: 9000000, minYield: 0, minLandSize: 2000, minBuildingSize: 0, minWale: 0, mustHave: ['Clear value-add angle'], bonus: ['Vacancy upside', 'Rent reversion', 'Capex improvement', 'Expansion land'] },
  { id: 'hardstand-sites', name: 'Hardstand Sites', description: 'Large land components, outdoor storage, truck access and low site coverage opportunities.', states: ['QLD', 'NSW', 'VIC'], propertyTypes: ['Industrial', 'Industrial Land', 'Hardstand', 'Logistics'], minPrice: 1500000, maxPrice: 12000000, minYield: 0, minLandSize: 5000, minBuildingSize: 0, minWale: 0, mustHave: ['Truck access', 'Usable yard'], bonus: ['Corner site', 'B-double access', 'Low site coverage'] },
  { id: 'development-land', name: 'Development Land', description: 'Industrial land with development, subdivision or future repositioning potential.', states: ['QLD', 'NSW', 'VIC'], propertyTypes: ['Industrial Land', 'Development Site', 'Industrial'], minPrice: 750000, maxPrice: 20000000, minYield: 0, minLandSize: 8000, minBuildingSize: 0, minWale: 0, mustHave: ['Industrial zoning', 'Services review'], bonus: ['Subdivision potential', 'Growth corridor', 'Infrastructure proximity'] },
]

export const defaultSourceSearches: SourceSearch[] = [
  { id: 'src-core-qld', categoryId: 'core-industrial', name: 'Core Industrial — QLD $2M–$15M', source: 'Saved portal searches', url: 'Paste saved search URL here', status: 'Ready for source URL', lastChecked: 'Manual setup pending', newMatches: 0, importMode: 'saved_search' },
  { id: 'src-value-national', categoryId: 'value-add', name: 'Value-Add Industrial — National', source: 'Commercial portals + agent alerts', url: 'Paste saved search URL here', status: 'Ready for source URL', lastChecked: 'Manual setup pending', newMatches: 0, importMode: 'saved_search' },
  { id: 'src-hardstand-east', categoryId: 'hardstand-sites', name: 'Hardstand / Yard Assets — East Coast', source: 'Keyword searches', url: 'Paste saved search URL here', status: 'Ready for source URL', lastChecked: 'Manual setup pending', newMatches: 0, importMode: 'saved_search' },
  { id: 'src-land-growth', categoryId: 'development-land', name: 'Industrial Development Land — Growth Corridors', source: 'Saved portal searches', url: 'Paste saved search URL here', status: 'Ready for source URL', lastChecked: 'Manual setup pending', newMatches: 0, importMode: 'saved_search' },
]

function includesAny(text: string, terms: string[]) {
  const lower = text.toLowerCase()
  return terms.some((term) => lower.includes(term.toLowerCase()))
}

export function normalisePropertyKey(input: { address?: string; title?: string; sourceUrl?: string; source_url?: string }) {
  const source = (input.sourceUrl || input.source_url || '').trim().toLowerCase().replace(/\?.*$/, '')
  const address = (input.address || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const title = (input.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 70)
  return source || address || title || `unknown-${Date.now()}`
}

export function findLikelyDuplicate(property: Listing, properties: Listing[]) {
  const key = normalisePropertyKey(property)
  return properties.find((item) => String(item.id) !== String(property.id) && normalisePropertyKey(item) === key)
}

export function scoreAgainstCategory(property: Listing, category: AcquisitionCategory): CategoryMatch {
  let score = 0
  const positives: string[] = []
  const negatives: string[] = []
  const text = `${property.title} ${property.address} ${property.type} ${property.notes}`

  if (category.states.includes(property.state)) { score += 14; positives.push(`Located in target state: ${property.state}`) } else negatives.push(`Outside target states: ${category.states.join(', ')}`)
  if (category.propertyTypes.some((type) => property.type.toLowerCase().includes(type.toLowerCase()) || property.title.toLowerCase().includes(type.toLowerCase()))) { score += 16; positives.push('Property type fits the strategy') } else negatives.push('Property type needs review')
  if (property.price >= category.minPrice && property.price <= category.maxPrice) { score += 14; positives.push('Price sits inside target range') } else negatives.push('Price is outside target range')
  if (property.yieldPct >= category.minYield) { score += category.minYield > 0 ? 14 : 5; if (category.minYield > 0) positives.push(`Yield clears ${category.minYield}% target`) } else negatives.push(`Yield below ${category.minYield}% target`)
  if (property.landSize >= category.minLandSize) { score += 14; positives.push('Land size clears minimum requirement') } else negatives.push('Land size below target')
  if (property.buildingSize >= category.minBuildingSize) { score += 10; if (category.minBuildingSize > 0) positives.push('Building size clears minimum requirement') } else negatives.push('Building size below target')
  if (property.leaseYears >= category.minWale) { score += category.minWale > 0 ? 10 : 4; if (category.minWale > 0) positives.push('WALE / lease term fits the strategy') } else negatives.push('Lease term may be too short')

  const bonusHits = (category.bonus || []).filter((bonus) => includesAny(text, bonus.split(' / ')))
  if (bonusHits.length) { score += Math.min(12, bonusHits.length * 4); positives.push(...bonusHits.map((item) => `Bonus signal: ${item}`)) }
  if (includesAny(text, ['flood', 'contamination', 'easement', 'vacant'])) { score -= 10; negatives.push('Risk keyword detected — requires review') }
  if (property.status === 'Passed' || property.status === 'Ignored') score -= 20

  const finalScore = Math.max(0, Math.min(99, Math.round(score)))
  const grade = finalScore >= 88 ? 'A+' : finalScore >= 78 ? 'A' : finalScore >= 65 ? 'B' : finalScore >= 50 ? 'Review' : 'Pass'
  return { category, score: finalScore, grade, positives, negatives, passed: finalScore >= 65 }
}

export function getBestMatch(property: Listing, categories = defaultCategories) {
  return categories.map((category) => scoreAgainstCategory(property, category)).sort((a, b) => b.score - a.score)[0]
}

export function getAllMatches(property: Listing, categories = defaultCategories) {
  return categories.map((category) => scoreAgainstCategory(property, category)).sort((a, b) => b.score - a.score)
}

export function getCategoryMatches(properties: Listing[], categoryId: string) {
  const category = defaultCategories.find((item) => item.id === categoryId) || defaultCategories[0]
  return properties.map((property) => ({ property, match: scoreAgainstCategory(property, category), duplicate: findLikelyDuplicate(property, properties) })).filter((item) => item.match.passed && item.property.status !== 'Passed' && item.property.status !== 'Ignored').sort((a, b) => b.match.score - a.match.score)
}

export function getImportHealth(sources: SourceSearch[], imports: ImportedListing[]): ImportHealth {
  const today = new Date().toDateString()
  const last = sources.map((s) => s.lastChecked).filter((v) => v && !v.includes('pending') && !v.includes('Not checked')).slice(0, 1)[0]
  return {
    totalSources: sources.length,
    activeSources: sources.filter((s) => s.status !== 'Inactive').length,
    checkedSources: sources.filter((s) => !s.lastChecked.includes('pending') && !s.lastChecked.includes('Not checked')).length,
    failedImports: imports.filter((i) => i.importStatus === 'failed').length,
    reviewRequired: imports.filter((i) => ['review_required', 'imported_to_properties'].includes(i.importStatus)).length,
    duplicates: imports.filter((i) => i.importStatus === 'duplicate' || i.duplicateOfPropertyId).length,
    importedToday: imports.filter((i) => i.createdAt && new Date(i.createdAt).toDateString() === today).length,
    lastChecked: last || 'Not checked yet',
  }
}

export async function fetchSourceSearches() {
  if (!isSupabaseConfigured || !supabase) return defaultSourceSearches
  const { data, error } = await supabase.from('source_searches').select('*').order('created_at', { ascending: false })
  if (error) return defaultSourceSearches
  if (!data?.length) return defaultSourceSearches
  return data.map((row: any) => ({ id: row.id, categoryId: row.category_id, name: row.name, source: row.source_name || row.source || 'Saved source', url: row.source_url || row.url || '', status: row.status || (row.active === false ? 'Inactive' : 'Active'), lastChecked: row.last_checked_at ? new Date(row.last_checked_at).toLocaleString() : 'Not checked yet', newMatches: Number(row.new_matches || 0), importMode: row.import_mode || 'saved_search', notes: row.notes || '' }))
}

export async function insertSourceSearch(input: Omit<SourceSearch, 'id' | 'lastChecked' | 'newMatches' | 'status'>) {
  if (!isSupabaseConfigured || !supabase) return null
  const { error } = await supabase.from('source_searches').insert({ category_id: input.categoryId, name: input.name, source_name: input.source, source_url: input.url, status: 'Active', import_mode: input.importMode || 'saved_search', new_matches: 0, active: true, notes: input.notes || null })
  if (error) throw error
}

export async function fetchImportedListings(limit = 20) {
  if (!isSupabaseConfigured || !supabase) return [] as ImportedListing[]
  const { data, error } = await supabase.from('imported_listings').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) return []
  return (data || []).map((row: any) => ({ id: row.id, sourceSearchId: row.source_search_id, propertyId: row.property_id, sourceName: row.source_name || 'Unknown source', sourceUrl: row.source_url || '', rawTitle: row.raw_title || 'Untitled import', rawAddress: row.raw_address || '', rawPrice: row.raw_price || '', importStatus: row.import_status || 'review_required', reviewNotes: row.review_notes || '', createdAt: row.created_at, duplicateKey: row.duplicate_key || '', duplicateOfPropertyId: row.duplicate_of_property_id || '', confidence: Number(row.confidence || 0) }))
}

export async function updateImportedListingStatus(id: string, status: string, notes?: string) {
  if (!isSupabaseConfigured || !supabase) return null
  const { error } = await supabase.from('imported_listings').update({ import_status: status, review_notes: notes || null }).eq('id', id)
  if (error) throw error
}

export function getMockImportedListings() {
  return seedListings.map((item) => ({ ...item, source: item.source.includes('Manual') ? 'Saved Search / Manual Review' : item.source }))
}
