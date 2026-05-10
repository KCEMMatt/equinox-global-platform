'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Globe2, Plus, Search, Sparkles } from 'lucide-react'
import { navItems } from '@/lib/mock-data'

export default function AppShell({ children, title, eyebrow, description }: { children: React.ReactNode; title: string; eyebrow?: string; description?: string }) {
  const pathname = usePathname()

  return (
    <main className="min-h-screen text-[#1E252C]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#08264A]/95 p-5 text-white shadow-2xl lg:block">
          <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-[#C59A42]/40">
                <Image src="/equinox-logo.png" alt="Equinox Global" fill className="object-contain p-1" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#C59A42]">Equinox Global</p>
                <h1 className="text-lg font-bold leading-tight">Platform</h1>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href} className={`tab w-full ${active ? 'tab-active' : ''}`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-8 rounded-3xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-[#F5D58A]">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">Automation Roadmap</p>
            </div>
            <p className="text-sm leading-6 text-white/70">Listing feeds, AI summaries, deal scoring and instant acquisition alerts will connect into this platform.</p>
          </div>
        </aside>

        <section className="relative flex-1 overflow-hidden bg-[#F5F0E8]">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'url(/app-background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-[#F5F0E8]/95 via-[#F5F0E8]/90 to-[#E9DDC9]/95" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <header className="mb-6 rounded-[2rem] border border-white/70 bg-white/65 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[#C59A42]">{eyebrow || 'Equinox Global Platform'}</p>
                  <h2 className="text-3xl font-black tracking-tight text-[#08264A] sm:text-4xl">{title}</h2>
                  {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#1E252C]/70">{description}</p> : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/60 shadow-sm">
                    <Search className="h-4 w-4" />
                    Global search
                  </div>
                  <Link href="/acquisitions" className="gold-button">
                    <Plus className="h-4 w-4" />
                    Mark Opportunity
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </header>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
