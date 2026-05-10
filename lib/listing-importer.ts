import { calculatePropertyScore, type PropertyInput } from './properties'

export type ParsedListing = {
  title: string
  address: string
  priceText: string
  price: number
  state: string
  type: string
  landSize: number
  buildingSize: number
  yieldPct: number
  leaseYears: number
  agent: string
  sourceUrl: string
  notes: string
}

function textBetween(input: string, regex: RegExp) {
  const match = input.match(regex)
  return match?.[1]?.replace(/\s+/g, ' ').trim() || ''
}

function stripTags(input: string) {
  return input.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function numberFromText(input: string) {
  const clean = input.toLowerCase().replace(/,/g, '')
  const million = clean.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)\s*m\b/)
  if (million) return Math.round(Number(million[1]) * 1000000)
  const dollar = clean.match(/\$\s*([0-9]{4,})/)
  if (dollar) return Number(dollar[1])
  return 0
}

function stateFromText(input: string) {
  const match = input.toUpperCase().match(/\b(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b/)
  return match?.[1] || 'QLD'
}

function extractJsonLd(html: string) {
  const regex = /<script[^>]+type=[\"']application\/ld\+json[\"'][^>]*>([\s\S]*?)<\/script>/gi
  let block: RegExpExecArray | null
  while ((block = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(block[1].trim())
      const items = Array.isArray(parsed) ? parsed : [parsed]
      const useful = items.find((item: any) => item?.name || item?.address || item?.offers)
      if (useful) return useful
    } catch {}
  }
  return null
}

export function parseListingHtml(html: string, sourceUrl: string): ParsedListing {
  const json = extractJsonLd(html)
  const plain = decodeHtml(stripTags(html))
  const metaTitle = decodeHtml(textBetween(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || textBetween(html, /<title[^>]*>([\s\S]*?)<\/title>/i))
  const description = decodeHtml(textBetween(html, /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i))

  const jsonAddress = typeof json?.address === 'string' ? json.address : [json?.address?.streetAddress, json?.address?.addressLocality, json?.address?.addressRegion, json?.address?.postalCode].filter(Boolean).join(', ')
  const title = json?.name || metaTitle || 'Imported commercial property'
  const address = jsonAddress || textBetween(plain, /([0-9][A-Za-z0-9\s,/-]+(?:QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\s*\d{4})/i) || ''
  const priceText = json?.offers?.price ? String(json.offers.price) : textBetween(plain, /(\$\s?[0-9][0-9,.]*(?:\s?m)?[^.]{0,40})/i)
  const lower = `${title} ${description} ${plain}`.toLowerCase()

  const type = lower.includes('land') ? 'Industrial Land' : lower.includes('warehouse') ? 'Warehouse' : 'Industrial'
  const landMatch = lower.match(/([0-9,]+)\s?(?:sqm|m2|m²)\s?(?:site|land|allotment)?/)
  const buildingMatch = lower.match(/([0-9,]+)\s?(?:sqm|m2|m²)\s?(?:warehouse|building|office|facility)/)
  const yieldMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)\s?%\s?(?:yield|return)/)
  const waleMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)\s?(?:year|yr|years)\s?(?:wale|lease)/)

  return {
    title: String(title).slice(0, 180),
    address: String(address).slice(0, 220),
    priceText,
    price: numberFromText(priceText),
    state: stateFromText(`${address} ${plain}`),
    type,
    landSize: landMatch ? Number(landMatch[1].replace(/,/g, '')) : 0,
    buildingSize: buildingMatch ? Number(buildingMatch[1].replace(/,/g, '')) : 0,
    yieldPct: yieldMatch ? Number(yieldMatch[1]) : 0,
    leaseYears: waleMatch ? Number(waleMatch[1]) : 0,
    agent: 'Imported source',
    sourceUrl,
    notes: `${description || 'Imported via Level 3 source importer.'}`.slice(0, 500),
  }
}

export function parsedListingToProperty(input: ParsedListing): PropertyInput {
  const property: PropertyInput = {
    title: input.title,
    address: input.address,
    state: input.state,
    type: input.type,
    price: input.price,
    landSize: input.landSize,
    buildingSize: input.buildingSize,
    yieldPct: input.yieldPct,
    leaseYears: input.leaseYears,
    agent: input.agent,
    source: 'Level 3 Importer',
    status: 'New Lead',
    sourceUrl: input.sourceUrl,
    notes: input.notes,
  }
  return { ...property, score: calculatePropertyScore(property) }
}
