'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, Circle, ExternalLink, Sparkles } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { fetchNotifications, markNotificationRead, type NotificationItem } from '@/lib/autonomous-acquisition'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [message, setMessage] = useState('')

  async function refresh() {
    const rows = await fetchNotifications()
    setNotifications(rows)
  }

  useEffect(() => { refresh() }, [])
  const unread = notifications.filter((item) => !item.read)

  async function markRead(item: NotificationItem) {
    setNotifications((current) => current.map((n) => n.id === item.id ? { ...n, read: true } : n))
    setMessage('Notification marked as read.')
    try { await markNotificationRead(item.id) } catch {}
  }

  return (
    <AppShell title="Notifications" eyebrow="Smart Acquisition Alerts" description="Only the alerts that matter: new A+ matches, risk flags, relists, price changes and import health warnings.">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {message ? <div className="rounded-3xl border border-[#C59A42]/25 bg-[#C59A42]/10 p-4 text-sm font-bold text-[#08264A]">{message}</div> : null}
          {notifications.map((item) => (
            <article key={item.id} className={`rounded-[2rem] border p-5 shadow-xl shadow-[#08264A]/5 backdrop-blur ${item.read ? 'border-white/70 bg-white/65' : 'border-[#C59A42]/40 bg-white/85'}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.read ? 'bg-[#F5F0E8] text-[#08264A]' : 'bg-[#C59A42] text-[#08264A]'}`}>{item.read ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}</div>
                  <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black text-[#08264A]">{item.title}</h3><span className="rounded-full bg-[#F5F0E8] px-3 py-1 text-xs font-black text-[#08264A]">{item.notification_type}</span></div><p className="mt-2 text-sm leading-6 text-black/60">{item.message}</p><p className="mt-2 text-xs text-black/40">{item.created_at ? new Date(item.created_at).toLocaleString() : 'Recently'}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">{!item.read ? <button onClick={() => markRead(item)} className="rounded-2xl bg-[#08264A] px-4 py-3 text-sm font-black text-[#F5D58A]">Mark read</button> : null}{item.property_id ? <a href={`/properties/${item.property_id}`} className="gold-button">Open Property <ExternalLink className="h-4 w-4" /></a> : null}</div>
              </div>
            </article>
          ))}
          {!notifications.length ? <div className="rounded-[2rem] border border-white/70 bg-white/75 p-10 text-center text-black/55">No notifications yet.</div> : null}
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-[#08264A]/5"><div className="flex items-center gap-2 text-[#08264A]"><Sparkles className="h-5 w-5 text-[#C59A42]" /><h3 className="text-xl font-black">Alert Summary</h3></div><div className="mt-4 space-y-3"><Summary label="Unread" value={unread.length} /><Summary label="Total" value={notifications.length} /><Summary label="High-value alerts" value={notifications.filter((n) => ['New A+ Match', 'Price Reduction', 'Relisted Opportunity'].includes(n.notification_type)).length} /></div></div>
          <div className="rounded-[2rem] border border-[#C59A42]/25 bg-[#08264A] p-5 text-white shadow-xl shadow-[#08264A]/20"><h3 className="text-xl font-black text-[#F5D58A]">Future Delivery</h3><p className="mt-3 text-sm leading-6 text-white/70">This in-app feed is ready for email, SMS, Slack or Teams delivery once your notification preferences are finalised.</p></div>
        </aside>
      </div>
    </AppShell>
  )
}

function Summary({ label, value }: { label: string; value: string | number }) { return <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-3"><div className="flex items-center gap-2 text-black/60"><Circle className="h-3 w-3 fill-[#C59A42] text-[#C59A42]" />{label}</div><span className="font-black text-[#08264A]">{value}</span></div> }
