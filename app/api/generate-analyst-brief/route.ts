import { NextResponse } from 'next/server'
import { fetchPropertyById } from '@/lib/properties'
import { buildAnalystBrief, createNotification } from '@/lib/autonomous-acquisition'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const propertyId = body.propertyId || body.property_id
    if (!propertyId) return NextResponse.json({ ok: false, error: 'propertyId is required.' }, { status: 400 })

    const property = await fetchPropertyById(String(propertyId))
    if (!property) return NextResponse.json({ ok: false, error: 'Property not found.' }, { status: 404 })

    const brief = buildAnalystBrief(property)

    if (supabase) {
      await supabase.from('ai_property_analysis').upsert({
        property_id: propertyId,
        executive_summary: brief.executiveSummary,
        strengths: brief.strengths,
        risks: brief.risks,
        strategic_fit: brief.strategicFit,
        dd_focus: brief.ddFocus,
        ai_confidence: brief.aiConfidence,
      }, { onConflict: 'property_id' })

      if (brief.aiConfidence >= 85) {
        await createNotification({
          title: 'High-confidence acquisition brief generated',
          message: `${property.title} has been analysed and ranked as a high-confidence acquisition review item.`,
          notification_type: 'AI Deal Analyst',
          property_id: String(propertyId),
        })
      }
    }

    return NextResponse.json({ ok: true, propertyId, brief })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Analyst brief generation failed.' }, { status: 500 })
  }
}
