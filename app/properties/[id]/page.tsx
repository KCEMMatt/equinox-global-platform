import AppShell from '@/components/AppShell'
import PropertyDetailClient from './PropertyDetailClient'

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppShell title="Property Detail" eyebrow="Deal Cockpit" description="Review acquisition metrics, scoring, notes, agent details and future due diligence items.">
      <PropertyDetailClient id={params.id} />
    </AppShell>
  )
}
