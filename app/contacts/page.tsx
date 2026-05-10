import AppShell from '@/components/AppShell'
import { Users } from 'lucide-react'

export default function ContactsPage() {
  return <AppShell title="Contacts" eyebrow="Agent & Partner CRM" description="Manage agents, vendors, tenants, lenders, consultants and investor contacts."><div className="rounded-[2rem] border border-white/70 bg-white/75 p-10 text-center shadow-xl shadow-[#08264A]/5 backdrop-blur"><Users className="mx-auto h-14 w-14 text-[#C59A42]" /><h3 className="mt-4 text-2xl font-black text-[#08264A]">Contacts CRM Placeholder</h3><p className="mt-2 text-black/60">Future versions can link agents directly to property opportunities.</p></div></AppShell>
}
