import { NextResponse } from 'next/server'
import { parseListingHtml, parsedListingToProperty } from '@/lib/listing-importer'
import { supabase } from '@/lib/supabase'
import { toSupabase } from '@/lib/properties'
import { getBestMatch, normalisePropertyKey } from '@/lib/acquisition-engine'

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
    const duplicateKey = normalisePropertyKey({ title: propertyInput.title, address: propertyInput.address, sourceUrl: propertyInput.sourceUrl })

    const { data: existing } = await supabase
      .from('properties')
      .select('id,title,address,source_url')
      .or(`source_url.eq.${url},address.ilike.${parsed.address || '__none__'}`)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const { data: imported } = await supabase
        .from('imported_listings')
        .insert({
          source_search_id: sourceSearchId || null,
          property_id: existing.id,
          source_name: 'Level 3 Importer',
          source_url: url,
          raw_title: parsed.title,
          raw_address: parsed.address,
          raw_price: parsed.priceText,
          raw_data: { parsed, mode, duplicateKey },
          import_status: 'duplicate',
          duplicate_key: duplicateKey,
          duplicate_of_property_id: existing.id,
          confidence: 92,
          review_notes: 'Likely duplicate detected by source URL or address. Existing property was not duplicated.',
        })
        .select('*')
        .single()

      if (sourceSearchId) {
        await supabase.from('source_searches').update({ last_checked_at: new Date().toISOString(), status: 'Checked — Duplicate', new_matches: 0 }).eq('id', sourceSearchId)
      }

      return NextResponse.json({ ok: true, duplicate: true, propertyId: existing.id, importedListingId: imported?.id, parsed })
    }

    const bestMatch = getBestMatch({ id: 'preview', score: 0, ...propertyInput })

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
        raw_data: { parsed, mode, bestMatch, duplicateKey },
        import_status: bestMatch.score >= 65 ? 'imported_to_properties' : 'review_required',
        duplicate_key: duplicateKey,
        confidence: bestMatch.score,
        review_notes: `Best category: ${bestMatch.category.name} (${bestMatch.score}%). Review score, address, price and metrics before pursuing.`,
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
