import { seedListings, type Listing } from './mock-data'
import { isSupabaseConfigured, supabase } from './supabase'

export type PropertyInput = Omit<Listing, 'id' | 'score'> & {
  score?: number
  zoning?: string
  occupancy?: number
  sourceUrl?: string
  imageUrl?: string
}

type PropertyRow = {
  id: string
  created_at?: string
  title?: string | null
  address?: string | null
  state?: string | null
  property_type?: string | null
  asking_price?: number | null
  yield?: number | null
  land_size?: number | null
  building_size?: number | null
  wale?: number | null
  agent_name?: string | null
  listing_source?: string | null
  acquisition_stage?: string | null
  status?: string | null
  match_score?: number | null
  notes?: string | null
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

export function createProperty(input: PropertyInput) {
  return {
    id: String(Date.now()),
    score: input.score || calculatePropertyScore(input),
    ...input,
  } satisfies Listing
}

export function getInitialProperties() {
  return seedListings
}

export function isLiveSupabaseEnabled() {
  return isSupabaseConfigured && Boolean(supabase)
}

export function fromSupabase(row: PropertyRow): Listing {
  return {
    id: row.id,
    title: row.title || row.address || 'Untitled Opportunity',
    address: row.address || '',
    state: row.state || 'QLD',
    type: row.property_type || 'Industrial',
    price: Number(row.asking_price || 0),
    landSize: Number(row.land_size || 0),
    buildingSize: Number(row.building_size || 0),
    yieldPct: Number(row.yield || 0),
    leaseYears: Number(row.wale || 0),
    agent: row.agent_name || 'Unassigned',
    source: row.listing_source || 'Manual Entry',
    status: row.acquisition_stage || row.status || 'New Lead',
    score: Number(row.match_score || 0),
    notes: row.notes || '',
  }
}

export function toSupabase(input: PropertyInput) {
  const score = input.score || calculatePropertyScore(input)
  return {
    title: input.title || 'Untitled Opportunity',
    address: input.address || null,
    state: input.state || null,
    property_type: input.type || null,
    asking_price: input.price || 0,
    land_size: input.landSize || 0,
    building_size: input.buildingSize || 0,
    yield: input.yieldPct || 0,
    wale: input.leaseYears || 0,
    agent_name: input.agent || null,
    listing_source: input.source || null,
    acquisition_stage: input.status || 'New Lead',
    status: input.status || 'New Lead',
    match_score: score,
    deal_grade: score >= 88 ? 'A+' : score >= 78 ? 'A' : score >= 65 ? 'B' : 'Pass',
    notes: input.notes || null,
  }
}

export async function fetchProperties() {
  if (!supabase) return seedListings

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(fromSupabase)
}

export async function fetchPropertyById(id: string) {
  if (!supabase) return seedListings.find((item) => String(item.id) === id) || null

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? fromSupabase(data) : null
}

export async function insertProperty(input: PropertyInput) {
  if (!supabase) return createProperty(input)

  const { data, error } = await supabase
    .from('properties')
    .insert(toSupabase(input))
    .select('*')
    .single()

  if (error) throw error
  return fromSupabase(data)
}

export async function updatePropertyNotes(id: string | number, notes: string) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('properties')
    .update({ notes })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return fromSupabase(data)
}

export async function deleteProperty(id: string | number) {
  if (!supabase) return

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) throw error
}
