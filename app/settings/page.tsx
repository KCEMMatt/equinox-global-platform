import AppShell from '@/components/AppShell'

export default function SettingsPage() {
  return <AppShell title="Settings" eyebrow="Platform Configuration" description="Manage Supabase connection, users, permissions and acquisition defaults."><div className="grid gap-4 md:grid-cols-2"><div className="card"><p className="label">Supabase</p><h3 className="mt-2 text-xl font-black text-[#08264A]">Environment Variables</h3><p className="mt-2 text-sm text-black/60">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.</p></div><div className="card"><p className="label">Access</p><h3 className="mt-2 text-xl font-black text-[#08264A]">Permissions Later</h3><p className="mt-2 text-sm text-black/60">Admin, director, staff, investor and contractor roles can be added later.</p></div></div></AppShell>
}
