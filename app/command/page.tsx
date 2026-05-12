export default function CommandDashboardPage() {
  const cards = [
    { title: "Top Opportunities Today", value: "High conviction queue", detail: "AI-ranked assets ready for review" },
    { title: "Import Health", value: "Operational", detail: "Webhook, retry and dedupe infrastructure ready" },
    { title: "Urgent Review", value: "DD focus", detail: "Items flagged by risk, pricing, or strategic fit" },
    { title: "Market Alerts", value: "Map layer ready", detail: "Vacancy, rental growth and logistics overlays prepared" },
  ]

  return (
    <main className="min-h-screen bg-[#08111f] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-[#d6b46a]">Equinox Global Platform</p>
          <h1 className="mt-3 text-4xl font-semibold">Operational Command Dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            Central acquisition war room for imports, high-conviction opportunities, review urgency,
            market alerts and deal intelligence.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {cards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-[#d6b46a]/20 bg-white/[0.04] p-5 shadow-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-[#d6b46a]">{card.title}</p>
              <h2 className="mt-4 text-xl font-semibold">{card.value}</h2>
              <p className="mt-2 text-sm text-slate-400">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-[#d6b46a]/20 bg-black/20 p-6">
          <h2 className="text-2xl font-semibold">v14 Operational Intelligence</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              "Webhook ingestion",
              "Import job tracking",
              "Dedupe engine",
              "AI deal ranking",
              "DD task framework",
              "Price history tracking",
            ].map((item) => (
              <div key={item} className="rounded-xl bg-white/[0.04] p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
