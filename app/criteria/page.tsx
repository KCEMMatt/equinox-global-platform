'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { profiles, seedListings } from '@/lib/mock-data'
import { CheckCircle2, SlidersHorizontal, Target } from 'lucide-react'

export default function CriteriaPage() {
  const [activeProfile, setActiveProfile] = useState('Core Industrial')

  return (
    <AppShell title="Criteria Engine" eyebrow="Acquisition Profiles" description="Define what Equinox wants to buy, then use those rules to score and rank commercial properties.">
      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr_.8fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur">
          <div className="mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-[#C59A42]" /><h3 className="text-xl font-black text-[#08264A]">Profiles</h3></div>
          <div className="space-y-3">
            {profiles.map((profile) => (
              <button key={profile.name} onClick={() => setActiveProfile(profile.name)} className={`w-full rounded-3xl border p-4 text-left transition ${activeProfile === profile.name ? 'border-[#C59A42] bg-[#C59A42]/10' : 'border-black/10 bg-white/70 hover:bg-white'}`}>
                <div className="flex items-center justify-between"><p className="font-black text-[#08264A]">{profile.name}</p><span className="text-sm font-bold text-[#C59A42]">{profile.match}%</span></div>
                <p className="mt-1 text-xs text-black/50">{profile.properties} matching properties · {profile.target}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-[#08264A]/5 backdrop-blur">
          <div className="mb-5 flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-[#C59A42]" /><h3 className="text-2xl font-black text-[#08264A]">Criteria Builder</h3></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="label">Profile Name</span><input className="input mt-2" defaultValue={activeProfile} /></label>
            <label><span className="label">Property Type</span><select className="input mt-2"><option>Industrial</option><option>Industrial Land</option><option>Warehouse</option><option>Commercial</option></select></label>
            <label><span className="label">Minimum Yield</span><input className="input mt-2" defaultValue="6.5%" /></label>
            <label><span className="label">Price Range</span><input className="input mt-2" defaultValue="$2M - $15M" /></label>
            <label><span className="label">Minimum Land Size</span><input className="input mt-2" defaultValue="3,000 m²" /></label>
            <label><span className="label">Minimum WALE</span><input className="input mt-2" defaultValue="3 years" /></label>
            <label><span className="label">States</span><input className="input mt-2" defaultValue="QLD, NSW, VIC" /></label>
            <label><span className="label">Zoning</span><input className="input mt-2" defaultValue="Industrial, Low Impact, General Industry" /></label>
          </div>
          <button className="gold-button mt-6">Save Criteria Profile</button>
          <p className="mt-3 text-sm text-black/55">Prototype action only. The next Supabase action will persist this profile.</p>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-[#08264A] p-6 text-white shadow-xl shadow-[#08264A]/15">
          <p className="label text-[#C59A42]">Live Match Preview</p>
          <h3 className="mt-2 text-4xl font-black">{seedListings.length}</h3>
          <p className="mt-1 text-white/60">sample properties checked</p>
          <div className="mt-6 space-y-3">
            {seedListings.map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-5 w-5 text-[#C59A42]" /><div><p className="font-bold">{item.title}</p><p className="text-sm text-white/55">{item.score}% match · {item.address}</p></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
