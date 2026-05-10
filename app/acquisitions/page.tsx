'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { seedListings, shortMoney } from '@/lib/mock-data'

export default function AcquisitionsPage() {
  const [title, setTitle] = useState('')
  return (
    <AppShell title="Acquisition Engine" eyebrow="Mark Opportunities" description="Start here when you find a potential commercial property. The next version will save this directly to Supabase.">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-[#08264A]/5 backdrop-blur">
          <h3 className="text-2xl font-black text-[#08264A]">Mark New Opportunity</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label><span className="label">Property Name</span><input className="input mt-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prime industrial warehouse" /></label>
            <label><span className="label">State</span><select className="input mt-2"><option>QLD</option><option>NSW</option><option>VIC</option><option>SA</option><option>WA</option><option>TAS</option><option>NT</option><option>ACT</option></select></label>
            <label><span className="label">Address / Suburb</span><input className="input mt-2" placeholder="Yatala, QLD" /></label>
            <label><span className="label">Asking Price</span><input className="input mt-2" placeholder="$3,850,000" /></label>
            <label><span className="label">Yield</span><input className="input mt-2" placeholder="6.8%" /></label>
            <label><span className="label">Land Size</span><input className="input mt-2" placeholder="4,200 m²" /></label>
          </div>
          <button className="gold-button mt-5">Save Opportunity</button>
          <p className="mt-3 text-sm text-black/55">Prototype action only. Once Supabase is wired, this button will create a real property record.</p>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-[#08264A] p-6 text-white shadow-xl shadow-[#08264A]/15">
          <p className="label text-[#C59A42]">Recent Opportunities</p>
          <div className="mt-4 space-y-3">
            {seedListings.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between"><h4 className="font-bold">{item.title}</h4><span className="text-[#C59A42]">{item.score}%</span></div>
                <p className="mt-1 text-sm text-white/60">{item.address} · {shortMoney(item.price)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
