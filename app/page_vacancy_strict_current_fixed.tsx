'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Building2, CalendarDays, ChartLine, FileText, Landmark, LayoutDashboard, Menu, Presentation, Users, X } from 'lucide-react'

type Row = any

const NAV = [
  ['Dashboard', LayoutDashboard],
  ['Assets', Building2],
  ['Other Assets', ChartLine],
  ['Leases', FileText],
  ['Debt', Landmark],
  ['Valuations', ChartLine],
  ['Calendar', CalendarDays],
  ['Investor View', Presentation],
  ['Lenders', Users],
] as const

const states = ['QLD','NSW','VIC','SA','WA','TAS','NT','ACT']
const propertyTypes = ['Industrial','Commercial','Residential']
const subtypes:any = {
  Industrial:['Warehouse','Hardstand','Logistics','Manufacturing','Mixed Industrial'],
  Commercial:['Office','Retail','Medical','Showroom','Mixed Commercial'],
  Residential:['House','Townhouse','Apartment','Unit Block','Development Site']
}
const constructionTypes = ['Land','Tilt Panel','Metal','Brick']
const propertyStatuses = ['Upcoming','Currently Owned','Sold']
const otherAssetTypes = ['Shares','Crypto','Cash']
const gold = '#C59A42', navy = '#08264A', grey = '#D7D0C4', red = '#8A2F2B'

function money(v:any){ return new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(Number(v||0)) }
function shortMoney(v:any){ const n=Number(v||0); if(Math.abs(n)>=1000000000) return "$"+(n/1000000000).toFixed(2)+"B"; if(Math.abs(n)>=1000000) return "$"+(n/1000000).toFixed(2)+"M"; if(Math.abs(n)>=1000) return "$"+(n/1000).toFixed(1)+"K"; return money(n) }
function numberValue(v:any){ return Number(v || 0) }
function todayISO(){ return new Date().toISOString().slice(0,10) }
function daysUntil(date?: string){ if(!date) return 999999; return Math.ceil((new Date(date+'T00:00:00').getTime()-Date.now())/86400000) }
function dateInRangeToday(start?:string,end?:string,status?:string){ const today=new Date(); today.setHours(0,0,0,0); const s=start?new Date(`${start}T00:00:00`):null; const e=end?new Date(`${end}T23:59:59`):null; return (status||'Current')==='Current' && (!s||s<=today) && (!e||e>=today) }
function leaseActiveDuring(l:any,start:Date,end:Date){ const leaseStart=l.lease_start_date?new Date(`${l.lease_start_date}T00:00:00`):null; const leaseEnd=l.lease_end_date?new Date(`${l.lease_end_date}T23:59:59`):null; return (l.status||'Current')==='Current' && (!leaseStart||leaseStart<=end) && (!leaseEnd||leaseEnd>=start) }
function leaseNet(l:any){ return numberValue(l.lease_price) }
function leaseGross(l:any){ return numberValue(l.lease_price)+numberValue(l.gst)+numberValue(l.outgoings) }
function yesNo(v:any){ return v ? 'Yes' : 'No' }
function parseBoolFilter(v:any){ return v === 'Yes' ? true : v === 'No' ? false : undefined }
function latestValuationFor(propertyId:string, valuations:Row[]){
  return [...valuations].filter(v=>v.property_id===propertyId).sort((a,b)=>String(b.valuation_date).localeCompare(String(a.valuation_date)))[0]
}

function halfYearPeriods(startYear = 2020, endYear = 2050){
  const rows:any[] = []
  for(let year=startYear; year<=endYear; year++){
    rows.push({year, half:'H1', period:`${year} H1`, endDate:new Date(`${year}-06-30T23:59:59`)})
    rows.push({year, half:'H2', period:`${year} H2`, endDate:new Date(`${year}-12-31T23:59:59`)})
  }
  return rows
}

function otherAssetSnapshotValueAt(snapshots:Row[], endDate:Date){
  const latest = [...snapshots]
    .filter((s:any)=>s.snapshot_date && new Date(`${s.snapshot_date}T00:00:00`).getTime() <= endDate.getTime())
    .sort((a:any,b:any)=>String(b.snapshot_date).localeCompare(String(a.snapshot_date)))[0]
  return latest ? otherAssetSnapshotTotal(latest) : 0
}

function actualPortfolioValueAt(properties:Row[], valuations:Row[], endDate:Date, snapshots:Row[] = []){
  const now = new Date()
  const periodStart = new Date(endDate)
  periodStart.setMonth(endDate.getMonth() < 6 ? 0 : 6)
  periodStart.setDate(1)
  if(periodStart.getTime() > now.getTime()) return null

  const cutoff = endDate.getTime() > now.getTime() ? now : endDate

  const propertyTotal = properties.reduce((total:any, p:any)=>{
    const status = p.status || (p.is_sold ? 'Sold' : 'Currently Owned')
    const purchaseDate = p.buying_settlement_date || p.purchase_date ? new Date(`${p.buying_settlement_date || p.purchase_date}T00:00:00`) : null
    const sellDate = p.selling_settlement_date || p.sale_date ? new Date(`${p.selling_settlement_date || p.sale_date}T23:59:59`) : null

    if(status === 'Upcoming') return total
    if(purchaseDate && purchaseDate.getTime() > cutoff.getTime()) return total
    if(status === 'Sold' && sellDate && sellDate.getTime() <= cutoff.getTime()) return total

    const latest = [...valuations]
      .filter((v:any)=>
        v.property_id===p.id &&
        v.valuation_date &&
        new Date(`${v.valuation_date}T00:00:00`).getTime() <= cutoff.getTime()
      )
      .sort((a:any,b:any)=>String(b.valuation_date).localeCompare(String(a.valuation_date)))[0]

    if(latest) return total + numberValue(latest.valuation_amount)
    return total + numberValue(p.display_value || p.current_value || p.purchase_price)
  },0)

  return propertyTotal + otherAssetSnapshotValueAt(snapshots, cutoff)
}

function periodIndex(year:any, half:any){ return (Number(year) - 2020) * 2 + (half === 'H2' ? 1 : 0) }
function indexToPeriod(index:number){ const year = 2020 + Math.floor(index / 2); const half = index % 2 === 0 ? 'H1' : 'H2'; return { year, half, period:`${year} ${half}` } }
function currentHalfPeriod(){ const d = new Date(); return { year:d.getFullYear(), half:d.getMonth() < 6 ? 'H1' : 'H2' } }
function curvedValueBetween(startValue:number, endValue:number, t:number){
  const clamped = Math.max(0, Math.min(1, t))
  if(startValue > 0 && endValue > 0){
    return startValue * Math.pow(endValue / startValue, clamped)
  }
  const eased = Math.pow(clamped, 1.35)
  return startValue + (endValue - startValue) * eased
}
function buildGoalTimeline(goalTargets:Row[], fromIndex = 0, toIndex = 61){
  const anchors = [
    { index:0, value:0, year:2020, half:'H1' },
    ...goalTargets
      .filter((g:any)=>g.year)
      .map((g:any)=>({ index:periodIndex(g.year, g.half || 'H1'), value:numberValue(g.target_value), year:Number(g.year), half:g.half || 'H1' }))
  ]
  const unique = Array.from(new Map(anchors.map((a:any)=>[a.index,a])).values()).sort((a:any,b:any)=>a.index-b.index)
  const result:any[] = []
  for(let idx=fromIndex; idx<=toIndex; idx++){
    const meta = indexToPeriod(idx)
    let target:any = null
    const exact = unique.find((a:any)=>a.index===idx)
    if(exact) target = exact.value
    else {
      const prev = [...unique].reverse().find((a:any)=>a.index < idx)
      const next = unique.find((a:any)=>a.index > idx)
      if(prev && next){
        const t = (idx - prev.index) / (next.index - prev.index)
        target = curvedValueBetween(prev.value, next.value, t)
      } else if(prev) target = prev.value
    }
    result.push({...meta, index:idx, target})
  }
  return result
}
function targetAtPeriod(goalTargets:Row[], year:any, half:any){
  const idx = periodIndex(year, half)
  return buildGoalTimeline(goalTargets, idx, idx)[0]?.target || 0
}

function csvEscape(value:any){
  const text = String(value ?? '')
  return `"${text.replace(/"/g,'""')}"`
}
function convertToCSV(rows:any[]){
  if(!rows.length) return ''
  const headers = Object.keys(rows[0])
  const body = rows.map(row=>headers.map(h=>csvEscape(row[h])).join(','))
  return [headers.join(','), ...body].join('\n')
}
function downloadTextFile(filename:string, content:string, mime='text/csv'){
  const blob = new Blob([content], {type:mime})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
function monthsSince(date?:string){
  if(!date) return 999999
  const d = new Date(`${date}T00:00:00`)
  const now = new Date()
  return (now.getFullYear()-d.getFullYear())*12 + (now.getMonth()-d.getMonth())
}
function annualInterestForLoan(loan:any){
  return numberValue(loan.amount) * (numberValue(loan.interest_rate) / 100)
}
function otherAssetSnapshotTotal(row:any){
  return numberValue(row?.shares_value) + numberValue(row?.crypto_value) + numberValue(row?.cash_value)
}
function snapshotPeriods(startYear = 2020, endYear = new Date().getFullYear()+1){
  const rows:any[] = []
  for(let year=startYear; year<=endYear; year++){
    rows.push({label:`1 Jan ${year}`, snapshot_date:`${year}-01-01`, year, half:'H1'})
    rows.push({label:`1 Jul ${year}`, snapshot_date:`${year}-07-01`, year, half:'H2'})
  }
  return rows
}
function missingOtherAssetSnapshotReminders(snapshots:Row[]){
  const today = new Date()
  const done = new Set(snapshots.map((s:any)=>s.snapshot_date))
  return snapshotPeriods(2020, today.getFullYear())
    .filter((p:any)=>new Date(`${p.snapshot_date}T00:00:00`).getTime() <= today.getTime() && !done.has(p.snapshot_date))
    .map((p:any)=>({title:`Other asset snapshot — ${p.label}`, subtitle:'Snapshot not recorded'}))
}
function usePersistentRange(key:string, defaults:any){
  const [range,setRange]=useState<any>(defaults)
  useEffect(()=>{
    try{
      const saved = localStorage.getItem(key)
      if(saved) setRange({...defaults, ...JSON.parse(saved)})
    }catch(e){}
  },[key])
  useEffect(()=>{
    try{ localStorage.setItem(key, JSON.stringify(range)) }catch(e){}
  },[key,range])
  return [range,setRange] as const
}
function loanActiveAt(loan:any, endDate:Date){
  if(loan.is_paid) return false
  const start = loan.start_date ? new Date(`${loan.start_date}T00:00:00`) : null
  const end = loan.end_date ? new Date(`${loan.end_date}T23:59:59`) : null
  return (!start || start <= endDate) && (!end || end >= endDate)
}
function actualDebtAt(loans:Row[], endDate:Date){
  const now = new Date()
  const periodStart = new Date(endDate)
  periodStart.setMonth(endDate.getMonth() < 6 ? 0 : 6)
  periodStart.setDate(1)
  if(periodStart.getTime() > now.getTime()) return null
  const cutoff = endDate.getTime() > now.getTime() ? now : endDate
  return loans.filter((l:any)=>loanActiveAt(l,cutoff)).reduce((a:any,l:any)=>a+numberValue(l.amount),0)
}
function propertyLeasedAt(property:any, leases:Row[], date:Date){
  // Strict current-vacancy rule:
  // Current lease = leased. Yet to Start / Ended / future start / expired = vacant.
  return leases.some((l:any)=>{
    if(l.property_id !== property.id) return false
    if((l.status || '') !== 'Current') return false

    const leaseStart = l.lease_start_date ? new Date(`${l.lease_start_date}T00:00:00`) : null
    const leaseEnd = l.lease_end_date ? new Date(`${l.lease_end_date}T23:59:59`) : null

    if(leaseStart && leaseStart > date) return false
    if(leaseEnd && leaseEnd < date) return false

    return true
  })
}
function vacancyData(properties:Row[], leases:Row[], date=new Date()){
  const owned = properties.filter((p:any)=>(p.status||'Currently Owned')==='Currently Owned')
  const leased = owned.filter((p:any)=>propertyLeasedAt(p, leases, date))
  const vacant = owned.filter((p:any)=>!propertyLeasedAt(p, leases, date))
  return {
    leasedCount: leased.length,
    vacantCount: vacant.length,
    totalCount: owned.length,
    leasedValue: leased.reduce((a:any,p:any)=>a+numberValue(p.display_value),0),
    vacantValue: vacant.reduce((a:any,p:any)=>a+numberValue(p.display_value),0),
    rate: owned.length ? (vacant.length / owned.length) * 100 : 0
  }
}
function vacancyHistory
(properties:Row[], leases:Row[], fromYear:number, fromHalf:string, toYear:number, toHalf:string){
  const fromIdx=periodIndex(fromYear,fromHalf)
  const toIdx=Math.max(fromIdx, periodIndex(toYear,toHalf))
  const now = new Date()
  return Array.from({length:toIdx-fromIdx+1},(_,i)=>indexToPeriod(fromIdx+i)).map((period:any)=>{
    const end = period.half==='H1'?new Date(`${period.year}-06-30T23:59:59`):new Date(`${period.year}-12-31T23:59:59`)
    if(end.getTime()>now.getTime()) return {...period, vacancy_rate:null}
    return {...period, vacancy_rate: vacancyData(properties, leases, end).rate}
  })
}


export default function App(){
  const [session,setSession]=useState<any>(null)
  const [active,setActive]=useState('Dashboard')
  const [mobileOpen,setMobileOpen]=useState(false)
  const [company,setCompany]=useState<Row|null>(null)
  const [loading,setLoading]=useState(true)
  const [properties,setProperties]=useState<Row[]>([])
  const [leases,setLeases]=useState<Row[]>([])
  const [loans,setLoans]=useState<Row[]>([])
  const [valuations,setValuations]=useState<Row[]>([])
  const [events,setEvents]=useState<Row[]>([])
  const [lenders,setLenders]=useState<Row[]>([])
  const [goalTargets,setGoalTargets]=useState<Row[]>([])
  const [otherAssetSnapshots,setOtherAssetSnapshots]=useState<Row[]>([])
  const [selectedProperty,setSelectedProperty]=useState<Row|null>(null)

  useEffect(()=>{
    if(!isSupabaseConfigured){ setLoading(false); return }
    supabase.auth.getSession().then(({data})=>{ setSession(data.session); setLoading(false) })
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(session) initCompanyAndLoad() },[session])

  const enrichedProperties = useMemo(()=>properties.map(p=>{
    const v = latestValuationFor(p.id, valuations)
    const latest = v ? numberValue(v.valuation_amount) : numberValue(p.current_value)
    return {...p, display_value: latest, latest_valuation:v}
  }),[properties,valuations])

  const latestOtherAssetSnapshot = useMemo(()=>[...otherAssetSnapshots].filter(s=>s.snapshot_date).sort((a:any,b:any)=>String(b.snapshot_date).localeCompare(String(a.snapshot_date)))[0], [otherAssetSnapshots])
  const latestOtherAssetValue = useMemo(()=> latestOtherAssetSnapshot ? numberValue(latestOtherAssetSnapshot.shares_value) + numberValue(latestOtherAssetSnapshot.crypto_value) + numberValue(latestOtherAssetSnapshot.cash_value) : 0, [latestOtherAssetSnapshot])

  const totals = useMemo(()=>{
    const owned = enrichedProperties.filter(p=>(p.status || (p.is_sold?'Sold':'Currently Owned')) === 'Currently Owned')
    const propertyValue = owned.reduce((a,p)=>a+numberValue(p.display_value || p.current_value),0)
    const otherAssetsValue = latestOtherAssetValue
    const value = propertyValue + otherAssetsValue
    const debt = loans.filter(l=>!l.is_paid).reduce((a,l)=>a+numberValue(l.amount),0)
    const privateDebt = loans.filter(l=>!l.is_paid && l.is_private).reduce((a,l)=>a+numberValue(l.amount),0)
    const netLeaseIncome = leases.filter(l=>dateInRangeToday(l.lease_start_date,l.lease_end_date,l.status)).reduce((a,l)=>a+leaseNet(l),0)
    const grossLeaseIncome = leases.filter(l=>dateInRangeToday(l.lease_start_date,l.lease_end_date,l.status)).reduce((a,l)=>a+leaseGross(l),0)
    const annualInterest = loans.filter(l=>!l.is_paid).reduce((a,l)=>a+annualInterestForLoan(l),0)
    const netCashflow = netLeaseIncome - annualInterest
    return {value, propertyValue, otherAssetsValue, debt, equity:value-debt, privateDebt, lenderDebt:debt-privateDebt, gross:grossLeaseIncome, netLeaseIncome, grossLeaseIncome, annualInterest, netCashflow, propertyCount:owned.length}
  },[enrichedProperties,latestOtherAssetValue,loans,leases])

  async function initCompanyAndLoad(){
    setLoading(true)
    const user = session.user
    const {data: membership,error:memberError} = await supabase.from('company_memberships').select('*, companies(*)').eq('user_id', user.id).limit(1).maybeSingle()
    if(memberError) console.error(memberError)
    let c = membership?.companies
    if(!c){
      const {data:newCompany,error:e1}=await supabase.from('companies').insert({name:'Equinox Capital', created_by:user.id}).select().single()
      if(e1) console.error(e1)
      c = newCompany
      if(c) await supabase.from('company_memberships').insert({company_id:c.id,user_id:user.id,role:'owner'})
    }
    setCompany(c)
    if(c) await loadAll(c.id)
    setLoading(false)
  }

  async function loadAll(companyId = company?.id){
    if(!companyId) return
    const [p,l,lo,v,e,le,gt,oas] = await Promise.all([
      supabase.from('properties').select('*').eq('company_id',companyId).order('created_at',{ascending:false}),
      supabase.from('leases').select('*').eq('company_id',companyId).order('lease_end_date',{ascending:true}),
      supabase.from('loans').select('*').eq('company_id',companyId).order('end_date',{ascending:true}),
      supabase.from('valuations').select('*').eq('company_id',companyId).order('valuation_date',{ascending:true}),
      supabase.from('calendar_events').select('*').eq('company_id',companyId).order('event_date',{ascending:true}),
      supabase.from('lenders').select('*').eq('company_id',companyId).order('company_name',{ascending:true}),
      supabase.from('goal_targets').select('*').eq('company_id',companyId).order('year',{ascending:true}).order('half',{ascending:true}),
      supabase.from('other_asset_snapshots').select('*').eq('company_id',companyId).order('snapshot_date',{ascending:true})
    ])
    setProperties(p.data||[]); setLeases(l.data||[]); setLoans(lo.data||[]); setValuations(v.data||[]); setEvents(e.data||[]); setLenders(le.data||[]); setGoalTargets(gt.data||[]); setOtherAssetSnapshots(oas.data||[])
  }

  async function backupCSV(){
    const tables = [
      {name:'properties', rows:properties},
      {name:'leases', rows:leases},
      {name:'loans', rows:loans},
      {name:'valuations', rows:valuations},
      {name:'lenders', rows:lenders},
      {name:'goal_targets', rows:goalTargets},
      {name:'calendar_events', rows:events},
      {name:'other_asset_snapshots', rows:otherAssetSnapshots}
    ]
    const sections = tables.map(t=>`### ${t.name}\n${convertToCSV(t.rows)}\n`).join('\n')
    downloadTextFile(`equinox-global-backup-${todayISO()}.csv`, sections)
  }

  function generateInvestorPDF(){
    const html = `
      <html>
        <head>
          <title>Investor Summary</title>
          <style>
            body{font-family:Arial,sans-serif;padding:40px;color:#1E252C}
            h1{font-family:Georgia,serif;color:#08264A;font-size:44px;margin-bottom:6px}
            h2{color:#08264A;margin-top:34px}
            .label{text-transform:uppercase;letter-spacing:.16em;color:#777;font-size:11px}
            .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0}
            .card{border:1px solid #ddd;border-radius:16px;padding:18px;background:#faf8f3}
            .value{font-size:26px;font-family:Georgia,serif;color:#08264A}
            table{width:100%;border-collapse:collapse;margin-top:12px}
            td,th{border-bottom:1px solid #ddd;padding:10px;text-align:left}
          </style>
        </head>
        <body>
          <p class="label">Confidential Investor Summary</p>
          <h1>${company?.name || 'Equinox Global'} Portfolio</h1>
          <p>${new Date().toLocaleDateString('en-AU')}</p>
          <div class="grid">
            <div class="card"><p class="label">Asset value</p><p class="value">${money(totals.value)}</p></div>
            <div class="card"><p class="label">Equity</p><p class="value">${money(totals.equity)}</p></div>
            <div class="card"><p class="label">Debt</p><p class="value">${money(totals.debt)}</p></div>
            <div class="card"><p class="label">Annual lease income</p><p class="value">${money(totals.netLeaseIncome)}</p></div>
          </div>
          <h2>Assets</h2>
          <table><thead><tr><th>Asset</th><th>Type</th><th>Status</th><th>Value</th></tr></thead><tbody>
            ${enrichedProperties.slice(0,20).map((p:any)=>`<tr><td>${p.address||p.property_name||''}</td><td>${p.property_type||''}</td><td>${p.status||''}</td><td>${money(p.display_value||p.current_value)}</td></tr>`).join('')}
          </tbody></table>
        </body>
      </html>`
    const w = window.open('', '_blank')
    if(!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  if(!isSupabaseConfigured) return <MissingConfig />
  if(loading) return <div className="min-h-screen grid place-items-center"><div className="card">Loading Equinox Capital…</div></div>
  if(!session) return <Login />

  return <div className="min-h-screen flex">
    <Sidebar active={active} setActive={(x:string)=>{setActive(x);setMobileOpen(false)}} mobileOpen={mobileOpen}/>
    <main className="flex-1 lg:ml-72">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-ivory/85 backdrop-blur px-4 py-3 lg:px-8 flex items-center justify-between">
        <button className="lg:hidden btn btn-ghost" onClick={()=>setMobileOpen(true)}><Menu size={18}/></button>
        <div><p className="label">Equinox Global</p><h1 className="font-serif text-2xl lg:text-4xl text-navy">{active}</h1></div>
        <div className="flex gap-2 items-center">
          <button className="btn btn-ghost hidden md:inline-flex" onClick={backupCSV}>Backup CSV</button>
          <button className="btn btn-primary hidden md:inline-flex" onClick={generateInvestorPDF}>Investor PDF</button>
          <button className="btn btn-ghost" onClick={()=>supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={()=>setMobileOpen(false)} />}
      <section className="p-4 lg:p-8 space-y-6">
        {active==='Dashboard' && <Dashboard totals={totals} properties={enrichedProperties} leases={leases} loans={loans} valuations={valuations} goalTargets={goalTargets} otherAssetSnapshots={otherAssetSnapshots} setActive={setActive}/>} 
        {active==='Edit Goals' && <GoalTargetsTab company={company} goalTargets={goalTargets} reload={loadAll} setActive={setActive}/>} 
        {active==='Assets' && <PropertiesTab company={company} properties={enrichedProperties} valuations={valuations} reload={loadAll} setSelectedProperty={setSelectedProperty}/>} 
        {active==='Leases' && <LeasesTab company={company} leases={leases} properties={enrichedProperties} reload={loadAll}/>} 
        {active==='Debt' && <LoansTab company={company} loans={loans} properties={enrichedProperties} lenders={lenders} reload={loadAll}/>} 
        {active==='Valuations' && <ValuationsTab company={company} valuations={valuations} properties={enrichedProperties} reload={loadAll}/>} 
        {active==='Calendar' && <CalendarTab leases={leases} properties={enrichedProperties}/>} 
        {active==='Investor View' && <InvestorMode totals={totals} properties={enrichedProperties} leases={leases} loans={loans} company={company}/>} 
        {active==='Lenders' && <LendersTab company={company} lenders={lenders} reload={loadAll}/>} 
        {active==='Other Assets' && <OtherAssetsTab company={company} snapshots={otherAssetSnapshots} reload={loadAll}/>} 
        {active==='Lease Income History' && <LeaseIncomeHistory leases={leases} setActive={setActive}/>} 
      </section>
    </main>
  </div>
}

function Sidebar({active,setActive,mobileOpen}:any){ return <aside className={`fixed z-50 inset-y-0 left-0 w-72 bg-navy text-white p-5 transition ${mobileOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
  <div className="flex justify-between items-start gap-4"><img src="/equinox-logo.png" className="w-48 rounded-xl bg-white/95 p-2"/><button className="lg:hidden" onClick={()=>setActive(active)}><X/></button></div>
  <nav className="mt-8 space-y-2">{NAV.map(([label,Icon])=><button key={label} onClick={()=>setActive(label)} className={`tab w-full ${active===label?'tab-active':''}`}><Icon size={18}/>{label}</button>)}</nav>
  <div className="absolute bottom-5 left-5 right-5 text-xs text-white/50">Acquire • Invest • Dominate</div>
</aside> }

function MissingConfig(){ return <div className="min-h-screen grid place-items-center p-6"><div className="card max-w-xl"><h1 className="font-serif text-3xl text-navy">Backend settings required</h1><p className="mt-3">Add your Supabase environment variables in Vercel, then redeploy.</p><pre className="mt-4 rounded-xl bg-black/90 text-white p-4 text-xs overflow-auto">NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co{`\n`}NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key</pre></div></div> }

function Login(){ const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [mode,setMode]=useState<'sign-in'|'sign-up'>('sign-in'), [msg,setMsg]=useState('')
  async function submit(){ setMsg(''); const r = mode==='sign-in' ? await supabase.auth.signInWithPassword({email,password}) : await supabase.auth.signUp({email,password}); if(r.error) setMsg(r.error.message); else setMsg(mode==='sign-up'?'Account created. Sign in now.':'Signed in.') }
  return <div className="min-h-screen grid place-items-center p-6"><div className="card max-w-md w-full"><img src="/equinox-logo.png" className="w-full rounded-xl mb-6"/><h1 className="font-serif text-3xl text-navy">Director Portal</h1><p className="text-sm text-black/60 mt-2">Secure portfolio command centre.</p><div className="mt-6 space-y-3"><input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button className="btn btn-primary w-full" onClick={submit}>{mode==='sign-in'?'Sign in':'Create account'}</button><button className="text-sm text-navy underline" onClick={()=>setMode(mode==='sign-in'?'sign-up':'sign-in')}>{mode==='sign-in'?'Create an account':'Already have an account?'}</button>{msg&&<p className="text-sm text-black/60">{msg}</p>}</div></div></div> }

function Stat({label,value}:any){ return <div className="card"><p className="label">{label}</p><p className="mt-2 text-2xl lg:text-3xl font-serif text-navy">{value}</p></div> }
function ChartCard({title,children}:any){ return <div className="card"><p className="label">{title}</p><div className="mt-4 h-[300px]">{children}</div></div> }
function PieBlock({data}:any){ const filtered=data.filter((d:any)=>numberValue(d.value)>0); return filtered.length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={filtered} dataKey="value" nameKey="name" outerRadius={95} label={({value}:any)=>shortMoney(value)}>{filtered.map((_:any,i:number)=><Cell key={i} fill={[navy,gold,grey,red][i%4]}/>)}</Pie><Tooltip formatter={(v:any)=>money(v)}/></PieChart></ResponsiveContainer>:<p className="text-sm text-black/55">No data yet.</p> }
function VacancyPieBlock({data}:any){
  const total = data.reduce((a:any,d:any)=>a+numberValue(d.value),0)
  if(!total) return <p className="text-sm text-black/55">No owned properties yet.</p>

  return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={95} label={({name,value}:any)=>`${name}: ${((numberValue(value)/total)*100).toFixed(0)}%`}>{data.map((_:any,i:number)=><Cell key={i} fill={[navy,red][i%2]}/>)}</Pie><Tooltip formatter={(v:any)=>`${v} ${Number(v)===1?'property':'properties'} (${((numberValue(v)/total)*100).toFixed(1)}%)`}/></PieChart></ResponsiveContainer>
}

function PortfolioSummaryBox({totals}:any){
  const positive = totals.value >= 0
  return <div className="card md:col-span-2 xl:col-span-2">
    <p className="label">Portfolio position</p>
    <p className={`mt-2 text-3xl lg:text-4xl font-serif ${positive?'text-green-700':'text-red-700'}`}>{money(totals.value)}</p>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl bg-white/70 p-3"><span className="label">Equity</span><br/><b>{money(totals.equity)}</b></div>
      <div className="rounded-xl bg-white/70 p-3"><span className="label">Active debt</span><br/><b>{money(totals.debt)}</b></div>
    </div>
  </div>
}

function Dashboard({totals,properties,leases,loans,valuations,goalTargets,otherAssetSnapshots,setActive}:any){
  const [goalRange,setGoalRange] = usePersistentRange('equinox_goal_range',{fromYear:2020,fromHalf:'H1',toYear:2050,toHalf:'H2'})
  const fromYear=Number(goalRange.fromYear||2020), fromHalf=goalRange.fromHalf||'H1', toYear=Number(goalRange.toYear||2050), toHalf=goalRange.toHalf||'H2'

  const allocation = properties.filter((p:any)=>(p.status||'Currently Owned')==='Currently Owned').map((p:any)=>({name:p.address||p.property_name,value:numberValue(p.display_value)}))
  const capital = [{name:'Equity',value:Math.max(totals.equity,0)},{name:'Private debt',value:totals.privateDebt},{name:'Commercial lender debt',value:totals.lenderDebt}]
  const currentVacancy = vacancyData(properties,leases,new Date())
  const vacancyPie = [{name:'Leased',value:currentVacancy.leasedCount},{name:'Vacant',value:currentVacancy.vacantCount}]
  const leaseAlerts = leases.filter((l:any)=>(l.status||'Current')==='Current').map((l:any)=>({...l,days:daysUntil(l.lease_end_date)})).filter((l:any)=>l.days<=90).sort((a:any,b:any)=>a.days-b.days)
  const settlementAlerts = [
    ...properties.filter((p:any)=>(p.status||'')==='Upcoming').map((p:any)=>({title:`Buying settlement — ${p.address}`, date:p.buying_settlement_date || p.purchase_date, type:'Buying'})),
    ...properties.filter((p:any)=>(p.status||'')==='Sold').map((p:any)=>({title:`Selling settlement — ${p.address}`, date:p.selling_settlement_date || p.sale_date, type:'Selling'})),
  ].map((e:any)=>({...e,days:daysUntil(e.date)})).filter((e:any)=>e.date && e.days<=90).sort((a:any,b:any)=>a.days-b.days)

  const valuationAlerts = properties
    .filter((p:any)=>(p.status||'Currently Owned')==='Currently Owned')
    .map((p:any)=>{
      const d = p.latest_valuation?.valuation_date
      return {title:p.address||p.property_name||'Asset', subtitle:d ? `Last valuation: ${monthsSince(d)} months ago` : 'No valuation recorded', months: d ? monthsSince(d) : 999999}
    })
    .filter((p:any)=>p.months >= 18)
    .sort((a:any,b:any)=>b.months-a.months)

  const otherAssetSnapshotAlerts = missingOtherAssetSnapshotReminders(otherAssetSnapshots)

  const timeline = useMemo(()=>{
    const fromIdx = periodIndex(fromYear, fromHalf)
    const toIdx = Math.max(fromIdx, periodIndex(toYear, toHalf))
    const targetRows = buildGoalTimeline(goalTargets, fromIdx, toIdx)
    return targetRows.map((row:any)=>{
      const endDate = row.half === 'H1' ? new Date(`${row.year}-06-30T23:59:59`) : new Date(`${row.year}-12-31T23:59:59`)
      return {
        ...row,
        actual: actualPortfolioValueAt(properties, valuations, endDate, otherAssetSnapshots),
        debt: actualDebtAt(loans, endDate)
      }
    })
  },[properties,valuations,goalTargets,otherAssetSnapshots,loans,fromYear,fromHalf,toYear,toHalf])

  const currentPeriod = currentHalfPeriod()
  const currentTarget = targetAtPeriod(goalTargets, currentPeriod.year, currentPeriod.half)
  const targetDifference = numberValue(totals.value) - numberValue(currentTarget)
  const targetPercent = currentTarget ? (targetDifference / currentTarget) * 100 : null
  const ahead = targetDifference >= 0
  const years = Array.from({length:31},(_,i)=>2020+i)
  const recommendations = buildRecommendations({totals, leaseAlerts, valuationAlerts, targetDifference, targetPercent})

  return <div className="space-y-6">
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      <PortfolioSummaryBox totals={totals}/>
      <CashflowBox totals={totals} setActive={setActive}/>
    </div>

    <div className="grid xl:grid-cols-3 gap-4">
      <ChartCard title="Portfolio value"><p className="font-serif text-3xl text-navy mb-3">{money(totals.value)}</p><PieBlock data={capital}/></ChartCard>
      <ChartCard title="Current property vacancy"><p className="font-serif text-3xl text-navy mb-3">{currentVacancy.rate.toFixed(1)}%</p><VacancyPieBlock data={vacancyPie}/></ChartCard>
      <div className="space-y-4">
        <UnifiedReminderBox reminders={{
          Lease: leaseAlerts.map((l:any)=>({title:l.contact_business_name||'Tenant', subtitle:`${l.days} days until lease end`})),
          Settlement: settlementAlerts.map((s:any)=>({title:s.title, subtitle:`${s.days} days remaining`})),
          Valuation: valuationAlerts,
          'Other Assets': otherAssetSnapshotAlerts
        }}/>
        <button className="btn btn-ghost" onClick={()=>setActive('Calendar')}>Open calendar</button>
      </div>
    </div>

    <div className="grid xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 card">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <p className="label">Goal timeline tracker — 2020 to 2050</p>
            <h3 className="font-serif text-2xl text-navy mt-1">Current Value vs Target</h3>
            <p className={`mt-2 text-2xl font-serif ${ahead?'text-green-700':'text-red-700'}`}>{ahead?'+':''}{money(targetDifference)} {targetPercent!==null && <span className="text-base font-sans">({ahead?'+':''}{targetPercent.toFixed(1)}%)</span>}</p>
            <p className="text-xs text-black/50 mt-1">Target for {currentPeriod.year} {currentPeriod.half}: {money(currentTarget)}</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setActive('Edit Goals')}>Edit Goals</button>
        </div>
        <div className="mt-5 grid md:grid-cols-4 gap-3">
          <Select label="View from year" value={fromYear} options={years} onChange={(v:any)=>setGoalRange({...goalRange,fromYear:Number(v)})}/>
          <Select label="From" value={fromHalf} options={['H1','H2']} onChange={(v:any)=>setGoalRange({...goalRange,fromHalf:v})}/>
          <Select label="View to year" value={toYear} options={years} onChange={(v:any)=>setGoalRange({...goalRange,toYear:Number(v)})}/>
          <Select label="To" value={toHalf} options={['H1','H2']} onChange={(v:any)=>setGoalRange({...goalRange,toHalf:v})}/>
        </div>
        <div className="mt-4 h-[330px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeline}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="period" interval={1} tickFormatter={(v:any)=>String(v).endsWith('H1') ? String(v).slice(0,4) : ''}/><YAxis tickFormatter={(v)=>`$${Math.round(Number(v)/1000000)}m`}/><Tooltip formatter={(v:any)=>money(v)} labelFormatter={(label)=>String(label)}/><Line connectNulls type="monotone" dataKey="target" name="Target" stroke={gold} strokeWidth={3} dot={{r:3}}/><Line connectNulls type="monotone" dataKey="actual" name="Actual value" stroke={navy} strokeWidth={3}/><Line connectNulls type="monotone" dataKey="debt" name="Actual debt" stroke={red} strokeWidth={3}/></LineChart></ResponsiveContainer></div>
      </div>
      <RecommendationsBox rows={recommendations}/>
    </div>
  </div>
}

function UnifiedReminderBox({reminders}:any){
  const [filters,setFilters]=useState<any>({Lease:true, Settlement:true, Valuation:true, 'Other Assets':true})
  const rows = Object.entries(reminders).flatMap(([type,items]:any)=>filters[type] ? items.map((item:any)=>({...item,type})) : [])
  return <div className="card">
    <div className="flex flex-col gap-3">
      <p className="label">Reminders</p>
      <div className="flex flex-wrap gap-2">
        {Object.keys(filters).map(type=><button key={type} className={`btn ${filters[type]?'btn-primary':'btn-ghost'}`} onClick={()=>setFilters({...filters,[type]:!filters[type]})}>{type}</button>)}
      </div>
      <div className="mt-1 space-y-2 max-h-64 overflow-y-auto pr-1">
        {rows.length?rows.map((r:any,i:number)=><div className="rounded-xl bg-gold/10 p-3 text-sm" key={i}><span className="label">{r.type}</span><br/><b>{r.title}</b><br/>{r.subtitle}</div>):<p className="text-sm text-black/55">Nothing due soon.</p>}
      </div>
    </div>
  </div>
}

function ReminderBox({title,rows}:any){ return <div className="card"><p className="label">{title}</p><div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">{rows.length?rows.map((r:any,i:number)=><div className="rounded-xl bg-gold/10 p-3 text-sm" key={i}><b>{r.title}</b><br/>{r.subtitle}</div>):<p className="text-sm text-black/55">Nothing due soon.</p>}</div></div> }

function CashflowBox({totals,setActive}:any){
  const positive = totals.netCashflow >= 0
  return <div className="card md:col-span-2 xl:col-span-2">
    <p className="label">Annual cashflow</p>
    <p className={`mt-2 text-2xl lg:text-3xl font-serif ${positive?'text-green-700':'text-red-700'}`}>{positive?'+':''}{money(totals.netCashflow)}</p>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <button className="rounded-xl bg-white/70 p-3 text-left hover:bg-white" onClick={()=>setActive('Lease Income History')}><span className="label">Net lease income</span><br/><b>{money(totals.netLeaseIncome)}</b></button>
      <div className="rounded-xl bg-white/70 p-3"><span className="label">Interest</span><br/><b>{money(totals.annualInterest)}</b></div>
    </div>
  </div>
}

function buildRecommendations({totals, leaseAlerts, valuationAlerts, targetDifference, targetPercent}:any){
  const rows:any[] = []
  if(totals.netCashflow < 0) rows.push({level:'Action needed', title:'Negative cashflow', subtitle:`Interest exceeds net lease income by ${money(Math.abs(totals.netCashflow))} annually.`})
  else rows.push({level:'Good', title:'Positive cashflow', subtitle:`Net lease income exceeds interest by ${money(totals.netCashflow)} annually.`})
  if(leaseAlerts.length) rows.push({level:'Watch', title:'Lease expiries approaching', subtitle:`${leaseAlerts.length} lease${leaseAlerts.length===1?'':'s'} ending within 90 days.`})
  if(valuationAlerts.length) rows.push({level:'Watch', title:'Valuations need attention', subtitle:`${valuationAlerts.length} asset${valuationAlerts.length===1?'':'s'} need valuation updates.`})
  if(targetPercent!==null) rows.push({level:targetDifference>=0?'Good':'Watch', title:targetDifference>=0?'Ahead of target':'Behind target', subtitle:`${targetDifference>=0?'+':''}${money(targetDifference)} (${targetDifference>=0?'+':''}${targetPercent.toFixed(1)}%).`})
  return rows.slice(0,6)
}
function RecommendationsBox({rows}:any){ return <div className="card"><p className="label">Recommendations</p><div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">{rows.map((r:any,i:number)=><div key={i} className="rounded-xl bg-white/70 p-3 text-sm"><p className="text-xs uppercase tracking-[0.16em] text-black/45">{r.level}</p><b>{r.title}</b><br/><span className="text-black/60">{r.subtitle}</span></div>)}</div></div> }


function Field({label,value,onChange,type='text'}:any){ const isNumber = type==='number'; return <label><span className="label">{label.replaceAll('_',' ')}</span><input className="input mt-1" type={isNumber?'text':type} inputMode={isNumber?'decimal':undefined} value={value||''} onChange={e=>onChange(e.target.value)}/></label> }
function Select({label,value,onChange,options}:any){ return <label><span className="label">{label}</span><select className="input mt-1" value={String(value ?? '')} onChange={e=>onChange(e.target.value)}>{options.map((o:any)=><option key={String(o)} value={String(o)}>{String(o||'Any')}</option>)}</select></label> }
function Bool({label,checked,onChange}:any){ return <label className="flex items-center gap-3 rounded-xl bg-white/60 p-3"><input type="checkbox" checked={!!checked} onChange={e=>onChange(e.target.checked)}/><span className="text-sm font-medium">{label}</span></label> }
function FormGrid({children}:any){ return <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{children}</div> }
function ListTools({query,setQuery,sort,setSort,sortOptions}:any){ return <div className="card flex flex-col md:flex-row gap-3"><input className="input" placeholder="Keyword search" value={query} onChange={e=>setQuery(e.target.value)}/><select className="input md:max-w-xs" value={sort} onChange={e=>setSort(e.target.value)}>{sortOptions.map((o:any)=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div> }
function filterRows(rows:any[],q:string,filters:any){ return rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase())).filter(r=>Object.entries(filters).every(([k,v]:any)=>{ if(v===''||v==null) return true; const parsed=parseBoolFilter(v); return parsed === undefined ? String(r[k])===String(v) : Boolean(r[k])===parsed })) }
function sortRows(rows:any[],sort:string){ const idx=sort.lastIndexOf('_'); const key=sort.slice(0,idx); const dir=sort.slice(idx+1); return [...rows].sort((a,b)=>((a[key]||'')>(b[key]||'')?1:-1)*(dir==='asc'?1:-1)) }

const propertySorts=[['purchase_price_asc','Purchase price ↑'],['purchase_price_desc','Purchase price ↓'],['sale_price_asc','Selling price ↑'],['sale_price_desc','Selling price ↓'],['purchase_date_asc','Purchase date ↑'],['purchase_date_desc','Purchase date ↓'],['selling_settlement_date_asc','Selling settlement ↑'],['selling_settlement_date_desc','Selling settlement ↓'],['size_m2_asc','Size ↑'],['size_m2_desc','Size ↓']]
function PropertiesTab({company,properties,valuations,reload,setSelectedProperty}:any){ const [editing,setEditing]=useState<any>(null), [query,setQuery]=useState(''), [sort,setSort]=useState('purchase_date_desc'), [filters,setFilters]=useState<any>({})
  const rows = sortRows(filterRows(properties,query,filters),sort)
  async function del(row:any){ if(confirm('Are you sure you want to delete this asset?')){ await supabase.from('properties').delete().eq('id',row.id); reload() } }
  return <div className="space-y-5"><ListTools query={query} setQuery={setQuery} sort={sort} setSort={setSort} sortOptions={propertySorts}/><PropertyFilters filters={filters} setFilters={setFilters}/>{editing&&<PropertyForm initial={editing} company={company} onSaved={()=>{setEditing(null);reload()}}/>}<button className="btn btn-primary" onClick={()=>setEditing({status:'Currently Owned'})}>Add asset</button><RecordList rows={rows} primary="address" secondary="property_type" value={(r:any)=>money(r.display_value || r.current_value)} onEdit={setEditing} onDelete={del}/></div> }
function PropertyFilters({filters,setFilters}:any){ return <div className="card grid md:grid-cols-5 gap-3"><Select label="Status" value={filters.status||''} options={['',...propertyStatuses]} onChange={(v:any)=>setFilters({...filters,status:v})}/><Select label="State" value={filters.state||''} options={['',...states]} onChange={(v:any)=>setFilters({...filters,state:v})}/><Select label="Mezzanine" value={filters.has_mezzanine||''} options={['','Yes','No']} onChange={(v:any)=>setFilters({...filters,has_mezzanine:v})}/><Select label="Standalone" value={filters.is_standalone||''} options={['','Yes','No']} onChange={(v:any)=>setFilters({...filters,is_standalone:v})}/><Select label="Sold" value={filters.is_sold||''} options={['','Yes','No']} onChange={(v:any)=>setFilters({...filters,is_sold:v})}/></div> }
function PropertyForm({initial={},company,onSaved}:any){
  const [f,setF]=useState<any>({property_type:'Industrial',subtype:'Warehouse',construction_type:'Tilt Panel',state:'QLD',status:'Currently Owned',has_mezzanine:false,is_standalone:false,is_sold:false,...initial})
  async function save(){
    const isNew=!f.id
    const {display_value,latest_valuation,current_value,...cleanForm}=f
    const payload={...cleanForm, company_id:company.id, is_sold:cleanForm.status==='Sold', purchase_price:numberValue(cleanForm.purchase_price), size_m2:numberValue(cleanForm.size_m2), parking_spots:numberValue(cleanForm.parking_spots), sale_price:numberValue(cleanForm.sale_price)}
    const q=isNew?supabase.from('properties').insert(payload).select().single():supabase.from('properties').update(payload).eq('id',f.id).select().single()
    const {data,error}=await q
    if(error){alert(error.message); return}
    const saved=data || f
    if(f.status === 'Currently Owned' && saved?.id && f.purchase_price){
      const {data:existing}=await supabase.from('valuations').select('id').eq('property_id',saved.id).eq('valuation_type','Purchase Price').limit(1)
      if(!existing?.length){
        const valuationDate = f.buying_settlement_date || f.purchase_date || todayISO()
        await supabase.from('valuations').insert({company_id:company.id, property_id:saved.id, valuation_date:valuationDate, valuation_amount:numberValue(f.purchase_price), valuation_type:'Purchase Price'})
      }
    }
    onSaved?.()
  }
  return <div className="card space-y-4"><FormGrid><Field label="property_name" value={f.property_name} onChange={(v:any)=>setF({...f,property_name:v})}/><Field label="address" value={f.address} onChange={(v:any)=>setF({...f,address:v})}/><Select label="Status" value={f.status} options={propertyStatuses} onChange={(v:any)=>setF({...f,status:v})}/><Select label="State" value={f.state} options={states} onChange={(v:any)=>setF({...f,state:v})}/><Field label="size_m2" type="number" value={f.size_m2} onChange={(v:any)=>setF({...f,size_m2:v})}/><Bool label="Mezzanine" checked={f.has_mezzanine} onChange={(v:any)=>setF({...f,has_mezzanine:v})}/><Field label="parking_spots" type="number" value={f.parking_spots} onChange={(v:any)=>setF({...f,parking_spots:v})}/><Field label="purchase_date" type="date" value={f.purchase_date} onChange={(v:any)=>setF({...f,purchase_date:v})}/><Field label="buying_settlement_date" type="date" value={f.buying_settlement_date} onChange={(v:any)=>setF({...f,buying_settlement_date:v})}/><Field label="purchase_price" type="number" value={f.purchase_price} onChange={(v:any)=>setF({...f,purchase_price:v})}/><Select label="Property type" value={f.property_type} options={propertyTypes} onChange={(v:any)=>setF({...f,property_type:v,subtype:(subtypes[v]||[''])[0]})}/><Select label="Subtype" value={f.subtype} options={subtypes[f.property_type]||[]} onChange={(v:any)=>setF({...f,subtype:v})}/><Select label="Construction" value={f.construction_type} options={constructionTypes} onChange={(v:any)=>setF({...f,construction_type:v})}/><Bool label="Standalone" checked={f.is_standalone} onChange={(v:any)=>setF({...f,is_standalone:v})}/><Field label="selling_price" type="number" value={f.sale_price} onChange={(v:any)=>setF({...f,sale_price:v})}/><Field label="selling_settlement_date" type="date" value={f.selling_settlement_date || f.sale_date} onChange={(v:any)=>setF({...f,selling_settlement_date:v,sale_date:v})}/></FormGrid><div className="flex gap-2"><button className="btn btn-primary" onClick={save}>Save asset</button><button className="btn btn-ghost" onClick={()=>onSaved?.()}>Cancel</button></div></div> }
function RecordList({rows,primary,secondary,value,onEdit,onDelete}:any){ return <div className="card overflow-hidden"><div className="hidden md:grid grid-cols-4 gap-4 label border-b border-black/10 pb-3"><span>Name/address</span><span>Detail</span><span>Value</span><span>Action</span></div>{rows.map((r:any)=><div key={r.id} className="grid md:grid-cols-4 gap-2 py-4 border-b border-black/10 last:border-0"><div><b>{r[primary]||'Untitled'}</b><p className="text-sm text-black/50">{r.state||r.status}</p></div><div className="text-sm text-black/65">{r[secondary]||r.contact_business_name||r.lender_name}</div><div className="font-serif text-navy">{value(r)}</div><div className="flex gap-2"><button className="btn btn-ghost" onClick={()=>onEdit(r)}>Edit</button>{onDelete&&<button className="btn btn-ghost" onClick={()=>onDelete(r)}>Delete</button>}</div></div>)}</div> }

function PropertyDropdown({properties,value,onChange}:any){ const [q,setQ]=useState(''); const list=properties.filter((p:any)=>(p.address||'').toLowerCase().includes(q.toLowerCase()))
 return <label><span className="label">Property address</span><input className="input mt-1 mb-2" placeholder="Search address" value={q} onChange={e=>setQ(e.target.value)}/><select className="input" value={value||''} onChange={e=>onChange(e.target.value)}><option value="">Select property</option>{list.map((p:any)=><option key={p.id} value={p.id}>{p.address}</option>)}</select></label> }
function LenderDropdown({lenders,value,onChange}:any){ const [q,setQ]=useState(''); const list=lenders.filter((l:any)=>(l.company_name||'').toLowerCase().includes(q.toLowerCase()))
 return <label><span className="label">Lender</span><input className="input mt-1 mb-2" placeholder="Search lender" value={q} onChange={e=>setQ(e.target.value)}/><select className="input" value={value||''} onChange={e=>onChange(e.target.value)}><option value="">Select lender</option>{list.map((l:any)=><option key={l.id} value={l.id}>{l.company_name}</option>)}</select></label> }

function CrudTab({title,table,company,rows,reload,editing,setEditing,fields,tools,extraAction}:any){ const [f,setF]=useState<any>({}); useEffect(()=>setF(editing||{}),[editing]); async function save(){ const payload={...f, company_id:company.id}; const q=f.id?supabase.from(table).update(payload).eq('id',f.id):supabase.from(table).insert(payload); const {error}=await q; if(error) alert(error.message); else {setEditing(null); reload()} }
 return <div className="space-y-5">{tools}<button className="btn btn-primary" onClick={()=>setEditing({})}>Add {title}</button>{editing&&<div className="card space-y-4"><FormGrid>{fields(f,setF)}</FormGrid><FileUpload company={company} relatedType={table} relatedId={f.id}/><button className="btn btn-primary" onClick={save}>Save {title}</button></div>}<div className="card">{rows.map((r:any)=><div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 py-4 last:border-b-0"><div><b>{r.address||r.contact_business_name||r.lender_name||r.company_name||r.valuation_type||'Record'}</b><p className="text-sm text-black/50">{r.status||r.state||r.valuation_date||r.end_date}</p></div><div className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setEditing(r)}>Edit</button>{extraAction?.(r)}</div></div>)}</div></div> }
function FileUpload({company,relatedType,relatedId}:any){ const [folder,setFolder]=useState('General'), [msg,setMsg]=useState(''); async function upload(e:any){ const file=e.target.files?.[0]; if(!file||!relatedId){setMsg('Save the record first, then upload files.'); return} const path=`${company.id}/${relatedType}/${relatedId}/${folder}/${Date.now()}-${file.name}`; const {error}=await supabase.storage.from('company-files').upload(path,file); setMsg(error?error.message:'Uploaded.') } return <div className="rounded-xl bg-white/60 p-3"><p className="label">Files / folders</p><div className="mt-2 flex flex-col md:flex-row gap-2"><input className="input" placeholder="Folder name" value={folder} onChange={e=>setFolder(e.target.value)}/><input className="input" type="file" onChange={upload}/></div>{msg&&<p className="text-sm text-black/50 mt-2">{msg}</p>}</div> }

function LeasesTab({company,leases,properties,reload}:any){
  const [editing,setEditing]=useState<any>(null)
  const [query,setQuery]=useState('')
  const [sort,setSort]=useState('lease_end_date_desc')
  const [statusFilter,setStatusFilter]=useState('')
  const [vacancyRange,setVacancyRange] = usePersistentRange('equinox_vacancy_range',{fromYear:2020,fromHalf:'H1',toYear:new Date().getFullYear(),toHalf:'H2'})
  const years=Array.from({length:31},(_,i)=>2020+i)
  const vacancyRows=vacancyHistory(properties, leases, Number(vacancyRange.fromYear||2020), vacancyRange.fromHalf||'H1', Number(vacancyRange.toYear||new Date().getFullYear()), vacancyRange.toHalf||'H2')
  const filtered = sortRows(filterRows(leases, query, statusFilter?{status:statusFilter}:{}), sort)
  const grouped = properties.map((p:any)=>{
    const rows = filtered.filter((l:any)=>l.property_id===p.id).sort((a:any,b:any)=>String(b.lease_start_date||'').localeCompare(String(a.lease_start_date||'')))
    return {property:p, rows, latest:rows[0]}
  }).filter((g:any)=>g.rows.length)
  const orphanRows = filtered.filter((l:any)=>!l.property_id)
  async function save(){
    const payload={...editing, company_id:company.id}
    const q=editing.id?supabase.from('leases').update(payload).eq('id',editing.id):supabase.from('leases').insert(payload)
    const {error}=await q
    if(error) alert(error.message); else {setEditing(null); reload()}
  }
  async function del(row:any){ if(confirm('Are you sure you want to delete this lease?')){ await supabase.from('leases').delete().eq('id',row.id); reload() } }
  const form = editing && <div className="card space-y-4"><FormGrid><PropertyDropdown properties={properties} value={editing.property_id} onChange={(v:any)=>setEditing({...editing,property_id:v})}/><Field label="contact_name" value={editing.contact_name} onChange={(v:any)=>setEditing({...editing,contact_name:v})}/><Field label="contact_number" value={editing.contact_number} onChange={(v:any)=>setEditing({...editing,contact_number:v})}/><Field label="email" value={editing.email} onChange={(v:any)=>setEditing({...editing,email:v})}/><Field label="contact_address" value={editing.contact_address} onChange={(v:any)=>setEditing({...editing,contact_address:v})}/><Field label="contact_business_name" value={editing.contact_business_name} onChange={(v:any)=>setEditing({...editing,contact_business_name:v})}/><Field label="net_lease_price" type="number" value={editing.lease_price} onChange={(v:any)=>setEditing({...editing,lease_price:v})}/><Field label="GST" type="number" value={editing.gst} onChange={(v:any)=>setEditing({...editing,gst:v})}/><Field label="outgoings" type="number" value={editing.outgoings} onChange={(v:any)=>setEditing({...editing,outgoings:v})}/><Field label="lease_start_date" type="date" value={editing.lease_start_date} onChange={(v:any)=>setEditing({...editing,lease_start_date:v})}/><Field label="lease_end_date" type="date" value={editing.lease_end_date} onChange={(v:any)=>setEditing({...editing,lease_end_date:v})}/><Select label="Status" value={editing.status||'Current'} options={['Current','Yet to Start','Ended']} onChange={(v:any)=>setEditing({...editing,status:v})}/></FormGrid><div className="flex gap-2"><button className="btn btn-primary" onClick={save}>Save Lease</button><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Cancel</button></div></div>
  return <div className="space-y-5">
    <div className="card"><p className="label">Vacancy rate history</p><h2 className="font-serif text-3xl text-navy">Property vacancy rate</h2><div className="mt-5 grid md:grid-cols-4 gap-3"><Select label="View from year" value={vacancyRange.fromYear} options={years} onChange={(v:any)=>setVacancyRange({...vacancyRange,fromYear:Number(v)})}/><Select label="From" value={vacancyRange.fromHalf} options={['H1','H2']} onChange={(v:any)=>setVacancyRange({...vacancyRange,fromHalf:v})}/><Select label="View to year" value={vacancyRange.toYear} options={years} onChange={(v:any)=>setVacancyRange({...vacancyRange,toYear:Number(v)})}/><Select label="To" value={vacancyRange.toHalf} options={['H1','H2']} onChange={(v:any)=>setVacancyRange({...vacancyRange,toHalf:v})}/></div><div className="mt-5 h-[300px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={vacancyRows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="period" tickFormatter={(v:any)=>String(v).endsWith('H1') ? String(v).slice(0,4) : ''}/><YAxis reversed domain={[0,100]} tickFormatter={(v)=>`${Number(v).toFixed(0)}%`}/><Tooltip formatter={(v:any)=>`${Number(v).toFixed(1)}%`}/><Line connectNulls type="monotone" dataKey="vacancy_rate" name="Vacancy rate" stroke={red} strokeWidth={3}/></LineChart></ResponsiveContainer></div></div>
    <div className="card grid md:grid-cols-3 gap-3"><input className="input" placeholder="Keyword search" value={query} onChange={e=>setQuery(e.target.value)}/><select className="input" value={sort} onChange={e=>setSort(e.target.value)}><option value="lease_end_date_desc">Lease end ↓</option><option value="lease_end_date_asc">Lease end ↑</option><option value="lease_start_date_desc">Lease start ↓</option><option value="lease_start_date_asc">Lease start ↑</option><option value="lease_price_desc">Price ↓</option><option value="lease_price_asc">Price ↑</option></select><Select label="Status filter" value={statusFilter} options={['','Current','Yet to Start','Ended']} onChange={setStatusFilter}/></div><button className="btn btn-primary" onClick={()=>setEditing({status:'Current'})}>Add Lease</button>{form}<div className="space-y-4">{grouped.map((g:any)=>{ const latest=g.latest; return <div className="card" key={g.property.id}><div><b className="text-navy">{g.property.address||g.property.property_name}</b><p className="text-sm text-black/60">Most recent: {latest?.contact_business_name||'Tenant'} • Ends {latest?.lease_end_date||'—'} • Net {money(leaseNet(latest))} • Gross {money(leaseGross(latest))}</p></div><div className="mt-3 divide-y divide-black/10">{g.rows.map((l:any)=><div key={l.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"><span>{l.lease_start_date||'—'} → {l.lease_end_date||'—'} | {l.contact_business_name||'Tenant'} | Net {money(leaseNet(l))} | Gross {money(leaseGross(l))} | {l.status||'Current'}</span><span className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setEditing(l)}>Edit</button><button className="btn btn-ghost" onClick={()=>del(l)}>Delete</button></span></div>)}</div></div>})}{orphanRows.length>0&&<div className="card"><b className="text-navy">Unassigned leases</b>{orphanRows.map((l:any)=><div key={l.id} className="py-3 flex justify-between border-b border-black/10"><span>{l.contact_business_name||'Tenant'} | Net {money(leaseNet(l))} | Gross {money(leaseGross(l))}</span><span className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setEditing(l)}>Edit</button><button className="btn btn-ghost" onClick={()=>del(l)}>Delete</button></span></div>)}</div>}</div></div>
}

function LoansTab({company,loans,properties,lenders,reload}:any){
  const [editing,setEditing]=useState<any>(null),[query,setQuery]=useState(''),[sort,setSort]=useState('start_date_desc')
  const currentDebt = loans.filter((l:any)=>!l.is_paid).reduce((a:any,l:any)=>a+numberValue(l.amount),0)
  const getLender=(loan:any)=>lenders.find((x:any)=>x.id===loan.lender_id)?.company_name || loan.lender_name || 'Lender'
  const loanMatchesQuery=(loan:any)=>{
    const q=query.toLowerCase().trim()
    if(!q) return true
    const property=properties.find((p:any)=>p.id===loan.property_id)
    return [loan.lender_name, getLender(loan), loan.amount, loan.interest_rate, loan.start_date, loan.end_date, property?.address, property?.property_name, property?.state]
      .filter(Boolean)
      .some((v:any)=>String(v).toLowerCase().includes(q))
  }
  const rows=sortRows(loans.filter(loanMatchesQuery),sort)
  const grouped=properties.map((p:any)=>{ const rs=rows.filter((l:any)=>l.property_id===p.id).sort((a:any,b:any)=>String(b.start_date||'').localeCompare(String(a.start_date||''))); return {property:p,rows:rs} }).filter((g:any)=>g.rows.length)
  const orphanRows=rows.filter((l:any)=>!l.property_id)
  async function save(){const payload={...editing,company_id:company.id,amount:numberValue(editing.amount),interest_rate:numberValue(editing.interest_rate)}; const q=editing.id?supabase.from('loans').update(payload).eq('id',editing.id):supabase.from('loans').insert(payload); const {error}=await q; if(error) alert(error.message); else {setEditing(null); reload()}}
  async function del(row:any){if(confirm('Are you sure you want to delete this loan?')){await supabase.from('loans').delete().eq('id',row.id); reload()}}
  const form=editing&&<div className="card space-y-4"><FormGrid><PropertyDropdown properties={properties} value={editing.property_id} onChange={(v:any)=>setEditing({...editing,property_id:v})}/><LenderDropdown lenders={lenders} value={editing.lender_id} onChange={(v:any)=>{ const lender=lenders.find((x:any)=>x.id===v); setEditing({...editing,lender_id:v,lender_name:lender?.company_name||editing.lender_name}) }}/><Field label="start_date" type="date" value={editing.start_date} onChange={(v:any)=>setEditing({...editing,start_date:v})}/><Field label="end_date" type="date" value={editing.end_date} onChange={(v:any)=>setEditing({...editing,end_date:v})}/><Field label="amount" type="number" value={editing.amount} onChange={(v:any)=>setEditing({...editing,amount:v})}/><Field label="interest_rate" type="number" value={editing.interest_rate} onChange={(v:any)=>setEditing({...editing,interest_rate:v})}/><Bool label="Private" checked={editing.is_private} onChange={(v:any)=>setEditing({...editing,is_private:v})}/><Bool label="Interest only" checked={editing.is_interest_only} onChange={(v:any)=>setEditing({...editing,is_interest_only:v})}/><Bool label="Loan paid" checked={editing.is_paid} onChange={(v:any)=>setEditing({...editing,is_paid:v})}/></FormGrid><div className="flex gap-2"><button className="btn btn-primary" onClick={save}>Save Loan</button><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Cancel</button></div></div>
  const renderLoan=(l:any)=><div key={l.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-black/10 last:border-b-0"><span>{getLender(l)} | {money(l.amount)} | {numberValue(l.interest_rate)}% | Started {l.start_date||'—'} | {l.is_paid?'Paid':'Active'}</span><span className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setEditing(l)}>Edit</button><button className="btn btn-ghost" onClick={()=>del(l)}>Delete</button></span></div>
  return <div className="space-y-5"><div className="card"><p className="label">Current debt value</p><p className="mt-2 text-3xl lg:text-4xl font-serif text-red-700">{money(currentDebt)}</p></div><ListTools query={query} setQuery={setQuery} sort={sort} setSort={setSort} sortOptions={[["start_date_desc","Start ↓"],["start_date_asc","Start ↑"],["end_date_desc","End ↓"],["end_date_asc","End ↑"],["amount_desc","Price ↓"],["amount_asc","Price ↑"],["interest_rate_desc","Interest ↓"],["interest_rate_asc","Interest ↑"]]}/><button className="btn btn-primary" onClick={()=>setEditing({})}>Add Debt</button>{form}<div className="space-y-4">{grouped.map((g:any)=><div className="card" key={g.property.id}><b className="text-navy">{g.property.address||g.property.property_name}</b><div className="mt-3 divide-y divide-black/10">{g.rows.map(renderLoan)}</div></div>)}{orphanRows.length>0&&<div className="card"><b className="text-navy">Unassigned debt</b><div className="mt-3 divide-y divide-black/10">{orphanRows.map(renderLoan)}</div></div>}</div></div>
}
function ValuationsTab({company,valuations,properties,reload}:any){
  const [editing,setEditing]=useState<any>(null),[query,setQuery]=useState(''),[sort,setSort]=useState('valuation_date_desc'),[typeFilter,setTypeFilter]=useState('')
  const valuationTypes=['Purchase Price','Bank Valuation','Agent Appraisal','Formal Valuation','Current Estimate','Sale Price']
  const rows=sortRows(filterRows(valuations,query,typeFilter?{valuation_type:typeFilter}:{}),sort)
  const groups=properties.map((p:any)=>{const vals=rows.filter((v:any)=>v.property_id===p.id).sort((a:any,b:any)=>String(b.valuation_date).localeCompare(String(a.valuation_date))); return {property:p, vals, latest:vals[0]}}).filter((g:any)=>g.vals.length)
  async function save(){const payload={...editing,company_id:company.id,valuation_amount:numberValue(editing.valuation_amount)}; const q=editing.id?supabase.from('valuations').update(payload).eq('id',editing.id):supabase.from('valuations').insert(payload); const {error}=await q; if(error) alert(error.message); else {setEditing(null); reload()}}
  async function del(v:any){if(confirm('Are you sure you want to delete this valuation?')){await supabase.from('valuations').delete().eq('id',v.id); reload()}}
  return <div className="space-y-5"><div className="card grid md:grid-cols-3 gap-3"><input className="input" placeholder="Keyword search" value={query} onChange={e=>setQuery(e.target.value)}/><select className="input" value={sort} onChange={e=>setSort(e.target.value)}><option value="valuation_date_desc">Date ↓</option><option value="valuation_date_asc">Date ↑</option><option value="valuation_amount_desc">Amount ↓</option><option value="valuation_amount_asc">Amount ↑</option></select><Select label="Valuation type" value={typeFilter} options={['',...valuationTypes]} onChange={setTypeFilter}/></div><button className="btn btn-primary" onClick={()=>setEditing({valuation_type:'Current Estimate'})}>Add Valuation</button>{editing&&<div className="card space-y-4"><FormGrid><PropertyDropdown properties={properties} value={editing.property_id} onChange={(v:any)=>setEditing({...editing,property_id:v})}/><Field label="valuation_date" type="date" value={editing.valuation_date} onChange={(v:any)=>setEditing({...editing,valuation_date:v})}/><Field label="valuation_amount" type="number" value={editing.valuation_amount} onChange={(v:any)=>setEditing({...editing,valuation_amount:v})}/><Select label="Valuation type" value={editing.valuation_type||'Current Estimate'} options={valuationTypes} onChange={(v:any)=>setEditing({...editing,valuation_type:v})}/><Field label="notes" value={editing.notes} onChange={(v:any)=>setEditing({...editing,notes:v})}/></FormGrid><div className="flex gap-2"><button className="btn btn-primary" onClick={save}>Save Valuation</button><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Cancel</button></div></div>}<div className="space-y-4">{groups.map((g:any)=><div className="card" key={g.property.id}><b className="text-navy">{g.property.address||g.property.property_name}</b><p className="text-sm text-black/60">Most recent: {g.latest.valuation_type} • {g.latest.valuation_date} • {money(g.latest.valuation_amount)}</p><div className="mt-3 divide-y divide-black/10">{g.vals.map((v:any)=><div key={v.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"><span>{v.valuation_date} | {v.valuation_type} | {money(v.valuation_amount)} {v.notes?`| ${v.notes}`:''}</span><span className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setEditing(v)}>Edit</button><button className="btn btn-ghost" onClick={()=>del(v)}>Delete</button></span></div>)}</div></div>)}</div></div>
}
function LendersTab({company,lenders,reload}:any){
  const [editing,setEditing]=useState<any>(null),[query,setQuery]=useState(''),[sort,setSort]=useState('company_name_asc')
  const rows=sortRows(filterRows(lenders,query,{}),sort)
  async function save(){const payload={...editing,company_id:company.id}; const q=editing.id?supabase.from('lenders').update(payload).eq('id',editing.id):supabase.from('lenders').insert(payload); const {error}=await q; if(error) alert(error.message); else {setEditing(null); reload()}}
  async function del(row:any){if(confirm('Are you sure you want to delete this lender?')){await supabase.from('lenders').delete().eq('id',row.id); reload()}}
  return <div className="space-y-5"><ListTools query={query} setQuery={setQuery} sort={sort} setSort={setSort} sortOptions={[["company_name_asc","Company ↑"],["company_name_desc","Company ↓"],["contact_name_asc","Contact ↑"],["contact_name_desc","Contact ↓"]]}/><button className="btn btn-primary" onClick={()=>setEditing({})}>Add Lender</button>{editing&&<div className="card space-y-4"><FormGrid><Field label="company_name" value={editing.company_name} onChange={(v:any)=>setEditing({...editing,company_name:v})}/><Field label="contact_name" value={editing.contact_name} onChange={(v:any)=>setEditing({...editing,contact_name:v})}/><Field label="contact_number" value={editing.contact_number} onChange={(v:any)=>setEditing({...editing,contact_number:v})}/><Field label="email" value={editing.email} onChange={(v:any)=>setEditing({...editing,email:v})}/></FormGrid><div className="flex gap-2"><button className="btn btn-primary" onClick={save}>Save Lender</button><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Cancel</button></div></div>}<div className="card overflow-hidden"><div className="hidden md:grid grid-cols-5 gap-4 label border-b border-black/10 pb-3"><span>Company</span><span>Contact</span><span>Phone</span><span>Email</span><span>Action</span></div>{rows.map((l:any)=><div key={l.id} className="grid md:grid-cols-5 gap-2 py-4 border-b border-black/10 last:border-0"><div><b>{l.company_name||'Untitled lender'}</b></div><div>{l.contact_name||'—'}</div><div>{l.contact_number||'—'}</div><div>{l.email||'—'}</div><div className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setEditing(l)}>Edit</button><button className="btn btn-ghost" onClick={()=>del(l)}>Delete</button></div></div>)}</div></div>
}

function GoalTargetsTab({company,goalTargets,reload,setActive}:any){
  const [editing,setEditing]=useState<any>(null)
  const [query,setQuery]=useState('')
  const [sort,setSort]=useState('year_asc')

  const rows = sortRows(filterRows(goalTargets,query,{}),sort)

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <button className="btn btn-ghost" onClick={()=>setActive('Dashboard')}>
          Back to dashboard
        </button>
      </div>

      <ListTools
        query={query}
        setQuery={setQuery}
        sort={sort}
        setSort={setSort}
        sortOptions={[
          ["year_asc","Year ↑"],
          ["year_desc","Year ↓"],
          ["target_value_asc","Goal value ↑"],
          ["target_value_desc","Goal value ↓"]
        ]}
      />

      <button className="btn btn-primary" onClick={()=>setEditing({})}>
        Add Goal
      </button>

      {editing && (
        <div className="card space-y-4">
          <FormGrid>
            <Field label="year" type="number" value={editing.year} onChange={(v:any)=>setEditing({...editing,year:v})}/>
            <Select label="Half" value={editing.half || 'H1'} options={['H1','H2']} onChange={(v:any)=>setEditing({...editing,half:v})}/>
            <Field label="target_value" type="number" value={editing.target_value} onChange={(v:any)=>setEditing({...editing,target_value:v})}/>
            <Field label="notes" value={editing.notes} onChange={(v:any)=>setEditing({...editing,notes:v})}/>
          </FormGrid>

          <button
            className="btn btn-primary"
            onClick={async ()=>{
              const payload = {...editing, company_id: company.id}
              const q = editing.id
                ? supabase.from('goal_targets').update(payload).eq('id',editing.id)
                : supabase.from('goal_targets').insert(payload)

              const {error} = await q
              if(error) alert(error.message)
              else {
                setEditing(null)
                reload()
              }
            }}
          >
            Save Goal
          </button>
        </div>
      )}

      {/* ✅ CUSTOM LIST DISPLAY */}
      <div className="card">
        {rows.map((g:any)=>(
          <div key={g.id} className="flex justify-between items-center border-b border-black/10 py-4 last:border-0">
            <div>
              <b>
                {g.year} {g.half || 'H1'} — {money(g.target_value)}
              </b>
              {g.notes && (
                <p className="text-sm text-black/50 mt-1">{g.notes}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={()=>setEditing(g)}>Edit</button>
              <button
                className="btn btn-ghost"
                onClick={async ()=>{
                  if(confirm('Delete this goal?')){
                    await supabase.from('goal_targets').delete().eq('id',g.id)
                    reload()
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {!rows.length && (
          <p className="text-sm text-black/50">No goals yet</p>
        )}
      </div>
    </div>
  )
}



function OtherAssetsTab({company,snapshots,reload}:any){
  const [editing,setEditing]=useState<any>(null)
  const [sort,setSort]=useState('snapshot_date_desc')
  const periods = snapshotPeriods(2020, new Date().getFullYear()+1)
  const rows = periods.map((p:any)=>{
    const existing = snapshots.find((s:any)=>s.snapshot_date===p.snapshot_date)
    return existing ? {...p, ...existing, total_value: otherAssetSnapshotTotal(existing), recorded:true} : {...p, shares_value:0, crypto_value:0, cash_value:0, total_value:0, recorded:false}
  })
  const sortedRows = sortRows(rows, sort)
  async function save(){
    const payload={
      company_id: company.id,
      snapshot_date: editing.snapshot_date,
      shares_value: numberValue(editing.shares_value),
      crypto_value: numberValue(editing.crypto_value),
      cash_value: numberValue(editing.cash_value),
      notes: editing.notes || null
    }
    const existing = snapshots.find((s:any)=>s.snapshot_date===editing.snapshot_date)
    const q = existing?.id
      ? supabase.from('other_asset_snapshots').update(payload).eq('id', existing.id)
      : supabase.from('other_asset_snapshots').insert(payload)
    const {error}=await q
    if(error){ alert(error.message); return }
    setEditing(null); reload()
  }
  return <div className="space-y-5">
    <div className="card flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <div><p className="label">Other assets</p><h2 className="font-serif text-3xl text-navy">Six-month snapshots</h2><p className="text-sm text-black/55 mt-1">Record shares, crypto and cash totals every 1 January and 1 July.</p></div>
      <select className="input md:max-w-xs" value={sort} onChange={e=>setSort(e.target.value)}>
        <option value="snapshot_date_desc">Date ↓</option>
        <option value="snapshot_date_asc">Date ↑</option>
      </select>
    </div>
    {editing&&<div className="card space-y-4"><div><p className="label">Snapshot date</p><h3 className="font-serif text-2xl text-navy">{editing.label || editing.snapshot_date}</h3></div><FormGrid><Field label="shares_value" type="number" value={editing.shares_value} onChange={(v:any)=>setEditing({...editing,shares_value:v})}/><Field label="crypto_value" type="number" value={editing.crypto_value} onChange={(v:any)=>setEditing({...editing,crypto_value:v})}/><Field label="cash_value" type="number" value={editing.cash_value} onChange={(v:any)=>setEditing({...editing,cash_value:v})}/><Field label="notes" value={editing.notes} onChange={(v:any)=>setEditing({...editing,notes:v})}/></FormGrid><div className="flex gap-2"><button className="btn btn-primary" onClick={save}>Save snapshot</button><button className="btn btn-ghost" onClick={()=>setEditing(null)}>Cancel</button></div></div>}
    <div className="card overflow-hidden"><div className="hidden md:grid grid-cols-5 gap-4 label border-b border-black/10 pb-3"><span>Date</span><span>Shares</span><span>Crypto</span><span>Cash</span><span>Action</span></div>{sortedRows.map((r:any)=><div key={r.snapshot_date} className="grid md:grid-cols-5 gap-2 py-4 border-b border-black/10 last:border-0"><div><b>{r.label}</b><p className="text-sm text-black/50">Total: {money(r.total_value)}</p></div><div>{money(r.shares_value)}</div><div>{money(r.crypto_value)}</div><div>{money(r.cash_value)}</div><div><button className="btn btn-ghost" onClick={()=>setEditing(r)}>{r.recorded?'Edit':'Add'} snapshot</button></div></div>)}</div>
  </div>
}


function LeaseIncomeHistory({leases,setActive}:any){
  const [incomeRange,setIncomeRange] = usePersistentRange('equinox_income_range',{fromYear:2020,fromHalf:'H1',toYear:new Date().getFullYear(),toHalf:'H2'})
  const fromYear=Number(incomeRange.fromYear||2020), fromHalf=incomeRange.fromHalf||'H1', toYear=Number(incomeRange.toYear||new Date().getFullYear()), toHalf=incomeRange.toHalf||'H2'
  const years=Array.from({length:31},(_,i)=>2020+i)
  const fromIdx=periodIndex(fromYear,fromHalf)
  const toIdx=Math.max(fromIdx, periodIndex(toYear,toHalf))
  const rows=Array.from({length:toIdx-fromIdx+1},(_,i)=>indexToPeriod(fromIdx+i)).map((period:any)=>{const start=period.half==='H1'?new Date(`${period.year}-01-01T00:00:00`):new Date(`${period.year}-07-01T00:00:00`); const end=period.half==='H1'?new Date(`${period.year}-06-30T23:59:59`):new Date(`${period.year}-12-31T23:59:59`); const active=leases.filter((l:any)=>leaseActiveDuring(l,start,end)); return {...period, net:active.reduce((a:any,l:any)=>a+leaseNet(l),0), gross:active.reduce((a:any,l:any)=>a+leaseGross(l),0)}})
  return <div className="space-y-5"><button className="btn btn-ghost" onClick={()=>setActive('Dashboard')}>Back to dashboard</button><div className="card"><p className="label">Lease income history</p><h2 className="font-serif text-3xl text-navy">Net and gross lease income</h2><div className="mt-5 grid md:grid-cols-4 gap-3"><Select label="View from year" value={fromYear} options={years} onChange={(v:any)=>setIncomeRange({...incomeRange,fromYear:Number(v)})}/><Select label="From" value={fromHalf} options={['H1','H2']} onChange={(v:any)=>setIncomeRange({...incomeRange,fromHalf:v})}/><Select label="View to year" value={toYear} options={years} onChange={(v:any)=>setIncomeRange({...incomeRange,toYear:Number(v)})}/><Select label="To" value={toHalf} options={['H1','H2']} onChange={(v:any)=>setIncomeRange({...incomeRange,toHalf:v})}/></div><div className="mt-5 h-[330px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="period" tickFormatter={(v:any)=>String(v).endsWith('H1') ? String(v).slice(0,4) : ''}/><YAxis tickFormatter={(v)=>`$${Math.round(Number(v)/1000)}k`}/><Tooltip formatter={(v:any)=>money(v)}/><Line type="monotone" dataKey="net" name="Net lease income" stroke={gold} strokeWidth={3}/><Line type="monotone" dataKey="gross" name="Gross lease income" stroke={navy} strokeWidth={3}/></LineChart></ResponsiveContainer></div></div><div className="card">{rows.filter(r=>r.net>0||r.gross>0).map(r=><div key={r.period} className="grid md:grid-cols-3 gap-2 border-b border-black/10 py-3"><b>{r.period}</b><span>Net: {money(r.net)}</span><span>Gross: {money(r.gross)}</span></div>)}</div></div>
}

function CalendarTab({leases,properties}:any){ const [view,setView]=useState<'month'|'year'>('month'), [month,setMonth]=useState(new Date()), [filters,setFilters]=useState<any>({leases:true,buying:true,selling:true})
  const calendarEvents=[
    ...(filters.leases?leases.map((l:any)=>({title:`Lease — ${l.contact_business_name||'Tenant'}`,date:l.lease_end_date,type:'Lease',color:navy})):[]),
    ...(filters.buying?properties.filter((p:any)=>(p.status||'')==='Upcoming').map((p:any)=>({title:`Buy — ${p.address}`,date:p.buying_settlement_date||p.purchase_date,type:'Buying',color:gold})):[]),
    ...(filters.selling?properties.filter((p:any)=>(p.status||'')==='Sold').map((p:any)=>({title:`Sell — ${p.address}`,date:p.selling_settlement_date||p.sale_date,type:'Selling',color:red})):[])
  ].filter((e:any)=>e.date)
  const y=month.getFullYear(), m=month.getMonth(); const start=new Date(y,m,1); const first=(start.getDay()+6)%7; const days=new Date(y,m+1,0).getDate(); const cells=[] as any[]; for(let i=0;i<first;i++) cells.push(null); for(let d=1;d<=days;d++) cells.push(new Date(y,m,d));
  return <div className="space-y-5"><div className="card flex flex-col lg:flex-row gap-3 justify-between"><div className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setMonth(new Date(y,m-1,1))}>Prev</button><button className="btn btn-ghost" onClick={()=>setMonth(new Date())}>Today</button><button className="btn btn-ghost" onClick={()=>setMonth(new Date(y,m+1,1))}>Next</button></div><h2 className="font-serif text-3xl text-navy">{month.toLocaleDateString('en-AU',{month:'long',year:'numeric'})}</h2><div className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setView('month')}>Month</button><button className="btn btn-ghost" onClick={()=>setView('year')}>Year</button></div></div><div className="card flex flex-wrap gap-4"><Bool label="Leases" checked={filters.leases} onChange={(v:any)=>setFilters({...filters,leases:v})}/><Bool label="Buying settlements" checked={filters.buying} onChange={(v:any)=>setFilters({...filters,buying:v})}/><Bool label="Selling settlements" checked={filters.selling} onChange={(v:any)=>setFilters({...filters,selling:v})}/></div>{view==='year'?<YearView month={month} setMonth={setMonth} setView={setView}/>:<div className="card overflow-x-auto"><div className="grid grid-cols-7 gap-px bg-black/10 rounded-xl overflow-hidden min-w-[760px]"><>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div className="bg-white/80 p-2 label" key={d}>{d}</div>)}</>{cells.map((date,i)=>{const iso=date?date.toISOString().slice(0,10):''; const dayEvents=calendarEvents.filter((e:any)=>e.date===iso); return <div key={i} className="bg-white/80 min-h-28 p-2"><div className="text-sm font-semibold">{date?.getDate()}</div><div className="mt-2 space-y-1">{dayEvents.slice(0,3).map((e:any,j:number)=><div key={j} title={e.title} className="rounded-md px-2 py-1 text-[11px] text-white truncate" style={{background:e.color}}>{e.title}</div>)}</div></div>})}</div></div>}</div> }
function YearView({month,setMonth,setView}:any){ const y=month.getFullYear(); return <div className="card grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({length:12},(_,i)=><button className="rounded-xl bg-white/70 p-5 text-left hover:bg-white" key={i} onClick={()=>{setMonth(new Date(y,i,1)); setView('month')}}><p className="font-serif text-xl text-navy">{new Date(y,i,1).toLocaleDateString('en-AU',{month:'long'})}</p></button>)}</div> }

function InvestorMode({totals,properties,leases,loans,company}:any){
  const mix=propertyTypes.map(t=>({name:t,value:properties.filter((p:any)=>p.property_type===t&&(p.status||'Currently Owned')==='Currently Owned').reduce((a:any,p:any)=>a+numberValue(p.display_value),0)}))
  const capital=[{name:'Equity',value:Math.max(totals.equity,0)},{name:'Private debt',value:totals.privateDebt},{name:'Commercial lender debt',value:totals.lenderDebt}]
  const v=vacancyData(properties,leases,new Date())
  const vacancyPie=[{name:'Leased',value:v.leasedCount},{name:'Vacant',value:v.vacantCount}]
  return <div className="space-y-6"><div className="card text-center py-10"><p className="label">Investor presentation mode</p><h1 className="font-serif text-4xl lg:text-6xl text-navy mt-3">{company?.name || 'Equinox Global'} Portfolio</h1><p className="mt-4 text-black/60">Acquire • Invest • Dominate</p></div><div className="grid md:grid-cols-4 gap-4"><Stat label="Asset value" value={money(totals.value)}/><Stat label="Equity" value={money(totals.equity)}/><Stat label="Debt" value={money(totals.debt)}/><Stat label="Annual lease income" value={money(totals.netLeaseIncome)}/></div><div className="grid xl:grid-cols-2 gap-4"><ChartCard title="Portfolio value"><p className="font-serif text-3xl text-navy mb-3">{money(totals.value)}</p><PieBlock data={capital}/></ChartCard><ChartCard title="Property vacancy rate"><p className="font-serif text-3xl text-navy mb-3">{v.rate.toFixed(1)}%</p><VacancyPieBlock data={vacancyPie}/></ChartCard></div></div>
}
