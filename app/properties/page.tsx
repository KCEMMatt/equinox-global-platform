import AppShell from '@/components/AppShell'
import PropertiesClient from './PropertiesClient'

export default function PropertiesPage() {
  return (
    <AppShell title="Property Feed" eyebrow="Acquisition Intelligence" description="A central feed for commercial opportunities, scores, agents and deal notes.">
      <PropertiesClient />
    </AppShell>
  )
}
