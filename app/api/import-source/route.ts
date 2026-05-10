import { NextResponse } from 'next/server'
import { parseListingHtml, parsedListingToProperty } from '@/lib/listing-importer'
import { supabase } from '@/lib/supabase'
import { toSupabase } from '@/lib/properties'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sourceSearchId = body.sourceSearchId as string | undefined
    const url = body.url as string | undefined
    const mode = (body.mode as string | undefined) || 'single_listing'

    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: 'Add a valid source/listing URL first.' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase is not configured on this deployment.' }, { status: 400 })
    }

    // Safe v7 importer: fetches a URL you saved and extracts public page metadata/JSON-LD.
    // For high-volume scraping, use a compliant provider/API and send results to this same queue.
    const response = await fetch(url, {
      headers: {
        'user-agent': 'EquinoxGlobalPlatform/1.0 (+manual saved source importer)',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      await supabase.from('imported_listings').insert({
        source_search_id: sourceSearchId || null,
        source_name: 'Level 3 Importer',
        source_url: url,
        raw_title: 'Import failed',
        raw_address: '',
        raw_price: '',
        raw_data: { status: response.status, statusText: response.statusText, mode },
        import_status: 'failed',
        review_notes: `Could not fetch source URL. HTTP ${response.status}`,
      })
      return NextResponse.json({ ok: false, error: `Could not fetch source URL. HTTP ${response.status}` }, { status: 502 })
    }

    const html = await response.text()
    const parsed = parseListingHtml(html, url)
    const propertyInput = parsedListingToProperty(parsed)

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert(toSupabase(propertyInput))
      .select('*')
      .single()

    if (propertyError) throw propertyError

    const { data: imported, error: importError } = await supabase
      .from('imported_listings')
      .insert({
        source_search_id: sourceSearchId || null,
        property_id: property.id,
        source_name: 'Level 3 Importer',
        source_url: url,
        raw_title: parsed.title,
        raw_address: parsed.address,
        raw_price: parsed.priceText,
        raw_data: { parsed, mode },
        import_status: 'imported_to_properties',
        review_notes: 'Imported automatically. Review score, address, price and metrics before pursuing.',
      })
      .select('*')
      .single()

    if (importError) throw importError

    if (sourceSearchId) {
      await supabase
        .from('source_searches')
        .update({ last_checked_at: new Date().toISOString(), status: 'Checked', new_matches: 1 })
        .eq('id', sourceSearchId)
    }

    return NextResponse.json({ ok: true, propertyId: property.id, importedListingId: imported.id, parsed })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Import failed' }, { status: 500 })
  }
}
