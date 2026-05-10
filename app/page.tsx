import AppShell from '@/components/AppShell'
import DashboardClient from './DashboardClient'

export default function DashboardPage() {
  return (
    <AppShell
      title="Command Dashboard"
      description="A central operating platform for acquisitions, criteria matching, property intelligence and future Equinox tools."
    >
      <DashboardClient />
    </AppShell>
  )
}
