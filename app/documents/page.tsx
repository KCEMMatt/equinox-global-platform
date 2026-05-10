import AppShell from '@/components/AppShell'
import { FileText } from 'lucide-react'

export default function DocumentsPage() {
  return <AppShell title="Documents" eyebrow="Document Vault" description="Store IMs, contracts, lease schedules, rent rolls and acquisition files here."><div className="rounded-[2rem] border border-white/70 bg-white/75 p-10 text-center shadow-xl shadow-[#08264A]/5 backdrop-blur"><FileText className="mx-auto h-14 w-14 text-[#C59A42]" /><h3 className="mt-4 text-2xl font-black text-[#08264A]">Document Vault Coming Next</h3><p className="mt-2 text-black/60">This will connect to Supabase Storage for files attached to properties and deals.</p></div></AppShell>
}
