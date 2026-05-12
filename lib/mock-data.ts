import { Bell, Building2, ChartNoAxesCombined, FileText, Import, LayoutDashboard, MapPin, Settings, ShieldCheck, Target, TrendingUp, Users } from 'lucide-react'

export const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Acquisitions', href: '/acquisitions', icon: Target },
  { label: 'Priority Queue', href: '/priority-queue', icon: TrendingUp },
  { label: 'Import Control', href: '/imports', icon: Import },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Criteria Engine', href: '/criteria', icon: ShieldCheck },
  { label: 'Property Feed', href: '/properties', icon: Building2 },
  { label: 'Map Intelligence', href: '/map', icon: MapPin },
  { label: 'Deal Pipeline', href: '/pipeline', icon: ChartNoAxesCombined },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export type Listing = {
  id: string | number
  title: string
  address: string
  state: string
  type: string
  price: number
  landSize: number
  buildingSize: number
  yieldPct: number
  leaseYears: number
  agent: string
  source: string
  status: string
  score: number
  notes: string
}

export const seedListings: Listing[] = [
  { id: 1, title: 'Prime Industrial Warehouse', address: 'Yatala, QLD', state: 'QLD', type: 'Industrial', price: 3850000, landSize: 4200, buildingSize: 1850, yieldPct: 6.8, leaseYears: 3.2, agent: 'CBRE Industrial', source: 'Manual / Agent', status: 'Reviewing', score: 91, notes: 'Strong corridor, good access to M1, tenant in place.' },
  { id: 2, title: 'Logistics Yard + Shed', address: 'Campbellfield, VIC', state: 'VIC', type: 'Industrial', price: 5200000, landSize: 6900, buildingSize: 2400, yieldPct: 5.9, leaseYears: 2.1, agent: 'JLL Melbourne', source: 'Commercial feed', status: 'New Lead', score: 78, notes: 'Large land component. Needs rent review analysis.' },
  { id: 3, title: 'Metro Warehouse Investment', address: 'Archerfield, QLD', state: 'QLD', type: 'Industrial', price: 2950000, landSize: 3100, buildingSize: 1320, yieldPct: 7.2, leaseYears: 4.6, agent: 'Ray White Commercial', source: 'Saved Listing', status: 'Underwriting', score: 88, notes: 'Good yield and lease term. Check flood overlay.' },
  { id: 4, title: 'Regional Industrial Landholding', address: 'Newcastle, NSW', state: 'NSW', type: 'Industrial Land', price: 1800000, landSize: 9800, buildingSize: 0, yieldPct: 0, leaseYears: 0, agent: 'Colliers', source: 'Off-market', status: 'Contacted', score: 72, notes: 'Development angle. Needs zoning and services review.' },
]

export const pipelineStages = ['New Lead', 'Reviewing', 'Contacted', 'Underwriting', 'DD', 'Negotiating', 'Under Contract', 'Settled', 'Passed']

export const profiles = [
  { name: 'Core Industrial', match: 92, properties: 18, target: '$2M–$15M', description: 'Stabilised industrial assets with strong income and access to major freight corridors.' },
  { name: 'Value Add', match: 84, properties: 11, target: '$1M–$8M', description: 'Assets with rent reversion, vacancy upside, capex improvement or repositioning potential.' },
  { name: 'Hardstand Assets', match: 78, properties: 7, target: '$1.5M–$12M', description: 'Large land holdings, truck access, outdoor storage and low site coverage opportunities.' },
]

export function money(value: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value || 0)
}

export function shortMoney(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return money(value)
}

export function m2(value: number) {
  return `${new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(value || 0)} m²`
}

export function scoreLabel(score: number) {
  if (score >= 88) return 'A+ Opportunity'
  if (score >= 78) return 'A Opportunity'
  if (score >= 65) return 'B Watchlist'
  return 'Pass / Low Fit'
}

export function statusClass(status: string) {
  if (status === 'Underwriting') return 'border-purple-200 bg-purple-50 text-purple-800'
  if (status === 'Reviewing') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'Contacted') return 'border-blue-200 bg-blue-50 text-blue-800'
  return 'border-black/10 bg-white text-black/70'
}
