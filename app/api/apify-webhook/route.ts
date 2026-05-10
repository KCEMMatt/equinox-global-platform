import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { toSupabase } from '@/lib/properties'
import { calculatePropertyScore, type PropertyInput } from '@/lib/properties'

export const dynamic = 'force-dynamic'

function asNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const clean = value.replace(/,/g, '')
  const million = clean.toLowerCase().match(/([0-9]+(?:\.[0-9]+)?)\s*m\b/)
  if (million) return Number(million[1]) * 1000000
  const number = clean.match(/[0-9]+(?:\.[0-9]+)?/)
  return number ? Number(number[0]) : 0
}

export async function POST(request: Request) {
  try {
    if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 400 })

    const token = request.headers.get('x-equinox-import-token')
    if (process.env.IMPORT_WEBHOOK_TOKEN && token !== process.env.IMPORT_WEBHOOK_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Unauthorized webhook.' }, { status: 401 })
    }

    const body = await request.json()
    const listings = Array.isArray(body) ? body : Array.isArray(body.listings) ? body.listings : [body]
    const inserted: string[] = []

    for (const item of listings) {
      const property: PropertyInput = {
        title: item.title || item.name || 'Imported commercial property',
        address: item.address || item.location || '',
        state: item.state || 'QLD',
        type: item.property_type || item.type || 'Industrial',
        price: asNumber(item.price || item.asking_price),
        landSize: asNumber(item.land_size || item.landSize),
        buildingSize: asNumber(item.building_size || item.buildingSize),
        yieldPct: asNumber(item.yield || item.yieldPct),
        leaseYears: asNumber(item.wale || item.leaseYears),
        agent: item.agent || item.agent_name || 'Imported source',
        source: item.source || 'External Scraper',
        status: 'New Lead',
        sourceUrl: item.url || item.source_url || '',
        notes: item.description || item.notes || 'Imported from external Level 3 scraper feed.',
      }
      property.score = calculatePropertyScore(property)

      const { data, error } = await supabase.from('properties').insert(toSupabase(property)).select('id').single()
      if (error) throw error
      inserted.push(data.id)

      await supabase.from('imported_listings').insert({
        property_id: data.id,
        source_name: property.source,
        source_url: property.sourceUrl,
        raw_title: property.title,
        raw_address: property.address,
        raw_price: String(item.price || item.asking_price || ''),
        raw_data: item,
        import_status: 'imported_to_properties',
        review_notes: 'Imported from external scraper webhook. Review before action.',
      })
    }

    return NextResponse.json({ ok: true, inserted })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Webhook import failed' }, { status: 500 })
  }
}
