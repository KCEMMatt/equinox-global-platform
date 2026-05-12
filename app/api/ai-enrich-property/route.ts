import { NextResponse } from 'next/server'
import { enrichProperty } from '@/lib/ai-enrichment'
import { fromSupabase } from '@/lib/properties'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { propertyId } = await request.json()
    if (!propertyId) return NextResponse.json({ ok: false, error: 'propertyId is required' }, { status: 400 })
    if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 400 })

    const { data, error } = await supabase.from('properties').select('*').eq('id', propertyId).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ ok: false, error: 'Property not found' }, { status: 404 })

    const property = fromSupabase(data)
    const enrichment = enrichProperty(property)

    await supabase.from('properties').update({
      ai_summary: enrichment.aiSummary,
      risk_flags: enrichment.riskFlags,
      opportunity_insights: enrichment.opportunityInsights,
      last_enriched_at: new Date().toISOString(),
    }).eq('id', propertyId)

    if (enrichment.notificationPriority !== 'low') {
      await supabase.from('notifications').insert({
        property_id: propertyId,
        title: enrichment.notificationPriority === 'high' ? 'High-priority acquisition match' : 'New acquisition opportunity',
        message: enrichment.aiSummary,
        priority: enrichment.notificationPriority,
        status: 'unread',
      })
    }

    return NextResponse.json({ ok: true, enrichment })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'AI enrichment failed' }, { status: 500 })
  }
}
