import { type Listing } from './mock-data'
import { getBestMatch } from './acquisition-engine'
import { enrichProperty } from './ai-enrichment'
import { isSupabaseConfigured, supabase } from './supabase'

export type PriorityItem = {
  property: Listing
  priorityScore: number
  confidence: 'High' | 'Medium' | 'Low'
  urgency: 'Immediate Review' | 'Review Today' | 'Monitor'
  reasons: string[]
  risks: string[]
}

export type ScheduledImportJob = {
  id: string
  source_search_id?: string | null
  source_name?: string | null
  frequency_minutes: number
  active: boolean
  last_run_at?: string | null
  next_run_at?: string | null
  last_status?: string | null
  last_error?: string | null
}

export type NotificationItem = {
  id: string
  title: string
  message: string
  notification_type: string
  property_id?: string | null
  read: boolean
  created_at?: string
}

export function buildPriorityQueue(properties: Listing[]): PriorityItem[] {
  return properties
    .filter((property) => !['Passed', 'Ignored'].includes(property.status))
    .map((property) => {
      const match = getBestMatch(property)
      const enrichment = enrichProperty(property)
      const dataCompleteness = [property.price, property.landSize, property.buildingSize, property.yieldPct, property.leaseYears].filter(Boolean).length * 3
      const riskPenalty = enrichment.riskFlags.length * 5
      const opportunityBoost = enrichment.opportunityInsights.length * 4
      const priorityScore = Math.max(0, Math.min(100, Math.round(match.score + dataCompleteness + opportunityBoost - riskPenalty)))

      return {
        property,
        priorityScore,
        confidence: (priorityScore >= 85 ? 'High' : priorityScore >= 68 ? 'Medium' : 'Low') as PriorityItem['confidence'],
        urgency: (priorityScore >= 88 ? 'Immediate Review' : priorityScore >= 72 ? 'Review Today' : 'Monitor') as PriorityItem['urgency'],
        reasons: [...match.positives.slice(0, 3), ...enrichment.opportunityInsights.slice(0, 2)],
        risks: [...match.negatives.slice(0, 2), ...enrichment.riskFlags.slice(0, 2)],
      }
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
}

export async function fetchScheduledImportJobs(): Promise<ScheduledImportJob[]> {
  if (!supabase) return mockScheduledImportJobs

  const { data, error } = await supabase
    .from('scheduled_import_jobs')
    .select('*, source_searches(name, source_name)')
    .order('next_run_at', { ascending: true })

  if (error) return mockScheduledImportJobs
  return (data || []).map((row: any) => ({
    id: row.id,
    source_search_id: row.source_search_id,
    source_name: row.source_searches?.name || row.source_searches?.source_name || 'Saved source',
    frequency_minutes: row.frequency_minutes || 60,
    active: row.active ?? true,
    last_run_at: row.last_run_at,
    next_run_at: row.next_run_at,
    last_status: row.last_status,
    last_error: row.last_error,
  }))
}

export async function fetchNotifications(limit = 30): Promise<NotificationItem[]> {
  if (!supabase) return mockNotifications

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return mockNotifications
  return (data || []) as NotificationItem[]
}

export async function createNotification(input: Omit<NotificationItem, 'id' | 'read' | 'created_at'>) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('notifications')
    .insert({ ...input, read: false })
    .select('*')
    .single()
  if (error) throw error
  return data as NotificationItem
}

export async function markNotificationRead(id: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as NotificationItem
}

export function buildAnalystBrief(property: Listing) {
  const match = getBestMatch(property)
  const enrichment = enrichProperty(property)
  const siteCoverage = property.landSize && property.buildingSize ? Math.round((property.buildingSize / property.landSize) * 100) : 0

  return {
    executiveSummary: `${property.title} is a ${match.score}% match to ${match.category.name}. The asset should be reviewed for income durability, land utility and strategic fit before underwriting.` ,
    strengths: [
      ...match.positives,
      ...(property.yieldPct >= 6.5 ? ['Yield sits within target acquisition range.'] : []),
      ...(siteCoverage > 0 && siteCoverage < 35 ? ['Low site coverage may create expansion, hardstand or repositioning optionality.'] : []),
    ].slice(0, 5),
    risks: [...match.negatives, ...enrichment.riskFlags].slice(0, 5),
    strategicFit: `Best current fit: ${match.category.name}. Priority should be based on confidence score, data completeness and whether the property supports Equinox's industrial acquisition strategy.`,
    ddFocus: [
      'Verify lease terms, WALE, rent review structure and tenant covenant.',
      'Check zoning, flood overlays, easements and environmental risks.',
      'Validate market rent, replacement value and comparable sales.',
      'Confirm access for trucks, hardstand quality and future expansion potential.',
    ],
    aiConfidence: Math.min(99, Math.max(40, match.score + (enrichment.opportunityInsights.length * 3) - (enrichment.riskFlags.length * 4))),
  }
}

export const mockScheduledImportJobs: ScheduledImportJob[] = [
  { id: 'job-1', source_name: 'Core Industrial QLD', frequency_minutes: 30, active: true, last_status: 'success', last_run_at: 'Recently', next_run_at: 'Next cycle' },
  { id: 'job-2', source_name: 'Hardstand Sites Australia', frequency_minutes: 60, active: true, last_status: 'success', last_run_at: 'Recently', next_run_at: 'Next cycle' },
  { id: 'job-3', source_name: 'Development Land', frequency_minutes: 240, active: true, last_status: 'queued', last_run_at: 'Pending', next_run_at: 'Next cycle' },
]

export const mockNotifications: NotificationItem[] = [
  { id: 'n-1', title: 'New high-priority acquisition match', message: 'A Core Industrial opportunity has been ranked for immediate review.', notification_type: 'New A+ Match', read: false, created_at: new Date().toISOString() },
  { id: 'n-2', title: 'Import cycle completed', message: 'Saved source searches were checked and queued for review.', notification_type: 'Import Health', read: false, created_at: new Date().toISOString() },
  { id: 'n-3', title: 'Potential risk flag detected', message: 'One opportunity contains language that may require additional due diligence.', notification_type: 'Risk Flag', read: true, created_at: new Date().toISOString() },
]
