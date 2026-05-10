'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarClock, FileText, MapPin, Phone, Save, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { m2, money, scoreLabel, seedListings, statusClass, type Listing } from '@/lib/mock-data'
import { STORAGE_KEY } from '@/lib/properties'

export default function PropertyDetailClient({ id }: { id: string }) {
  const [properties, setProperties] = useState<Listing[]>(seedListings)
  const [notes, setNotes] = useState('')
  const property = useMemo(() => properties.find((item) => String(item.id) === id), [properties, id])

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) setProperties(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (property) setNotes(property.notes)
  }, [property])

  function saveNotes() {
    const next = properties.map((item) => item.id === property?.id ? { ...item, notes } : item)
    setProperties(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  if (!property) {
    return (
      <div className="rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-xl shadow-[#08264A]/5 backdrop-blur">
        <Link href="/properties" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#C59A42]"><ArrowLeft className="h-4 w-4" /> Back to properties</Link>
        <h3 className="text-2xl font-black text-[#08264A]">Property not found</h3>
        <p className="mt-2 text-sm text-black/60">This local record may be on another browser or has not been saved to Supabase yet.</p>
      </div>
    )
  }

  const strengths = [
    property.yieldPct >= 6.5 ? 'Yield meets Equinox target' : 'Yield requires review',
    property.landSize >= 3500 ? 'Strong land component' : 'Smaller landholding',
    property.leaseYears >= 3 ? 'Healthy lease profile' : 'Shorter WALE / lease risk',
    property.state === 'QLD' ? 'Priority state for current platform testing' : 'Interstate opportunity',
  ]

  return (
    <div className="space-y-5">
      <Link href="/properties" className="inline-flex items-center gap-2 text-sm font-bold text-[#C59A42]"><ArrowLeft className="h-4 w-4" /> Back to property feed</Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl shadow-[#08264A]/5 backdrop-blur">
          <div className="mb-3 flex flex-wrap gap-2"><span className={`pill ${statusClass(property.status)}`}>{property.status}</span><span className="pill border-[#C59A42]/30 bg-[#C59A42]/10 text-[#8A6728]">{scoreLabel(property.score)}</span></div>
          <h3 className="text-3xl font-black text-[#08264A]">{property.title}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-black/60"><MapPin className="h-4 w-4" /> {property.address}</p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="card"><p className="label">Price</p><p className="text-xl font-black text-[#08264A]">{money(property.price)}</p></div>
            <div className="card"><p className="label">Yield</p><p className="text-xl font-black text-[#08264A]">{property.yieldPct}%</p></div>
            <div className="card"><p className="label">Match Score</p><p className="text-xl font-black text-[#08264A]">{property.score}%</p></div>
            <div className="card"><p className="label">Land</p><p className="text-xl font-black text-[#08264A]">{m2(property.landSize)}</p></div>
            <div className="card"><p className="label">Building</p><p className="text-xl font-black text-[#08264A]">{m2(property.buildingSize)}</p></div>
            <div className="card"><p className="label">WALE</p><p className="text-xl font-black text-[#08264A]">{property.leaseYears} yrs</p></div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#C59A42]/30 bg-[#08264A] p-6 text-white shadow-xl shadow-[#08264A]/15">
          <p className="text-xs uppercase tracking-[0.24em] text-[#C59A42]">Deal Cockpit</p>
          <p className="mt-4 text-6xl font-black">{property.score}%</p>
          <p className="mt-2 text-sm text-white/65">Weighted acquisition fit based on yield, land, building, WALE and notes.</p>
          <div className="mt-6 space-y-3">
            {strengths.map((strength) => <div key={strength} className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/75"><ShieldCheck className="mt-0.5 h-4 w-4 text-[#C59A42]" /> {strength}</div>)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C59A42]">Internal Notes</p><h3 className="text-2xl font-black text-[#08264A]">Acquisition notes</h3></div>
            <button onClick={saveNotes} className="gold-button"><Save className="h-4 w-4" /> Save Notes</button>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-56 w-full rounded-3xl border border-black/10 bg-white/90 p-5 text-sm leading-7 outline-none focus:border-[#C59A42]/60 focus:ring-4 focus:ring-[#C59A42]/15" />
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C59A42]">Agent</p>
            <h3 className="mt-2 text-xl font-black text-[#08264A]">{property.agent}</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-black/60"><Phone className="h-4 w-4" /> Contact details next</p>
          </div>
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C59A42]">Files</p>
            <div className="mt-4 space-y-3 text-sm text-black/65"><p className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#C59A42]" /> IM upload next</p><p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#C59A42]" /> Due diligence dates next</p><p className="flex items-center gap-2"><Target className="h-4 w-4 text-[#C59A42]" /> Pipeline actions next</p></div>
          </div>
          <div className="rounded-[2rem] border border-[#C59A42]/25 bg-[#C59A42]/10 p-5">
            <div className="flex items-start gap-3"><Sparkles className="mt-1 h-5 w-5 text-[#C59A42]" /><p className="text-sm leading-6 text-black/65">This page becomes the full deal cockpit once Supabase documents, tasks and activity logs are connected.</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
