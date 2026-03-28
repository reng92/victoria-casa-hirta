import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="bg-brand-blue text-white py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Victoria <span className="text-brand-red">Casa Hirta</span>
          </h1>
          <p className="text-white/70 text-lg md:text-xl mb-8">
            Calcio amatoriale con passione e orgoglio in Campania
          </p>
          <Link
            href="/calendario"
            className="inline-block bg-brand-red text-white font-semibold px-8 py-3 rounded-full hover:opacity-90 transition"
          >
            Prossima partita →
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/rosa", label: "🧑‍🤝‍🧑 Rosa", desc: "Tutti i giocatori" },
          { href: "/calendario", label: "📅 Calendario", desc: "Partite e risultati" },
          { href: "/classifica", label: "🏆 Classifica", desc: "La nostra posizione" },
          { href: "/cannonieri", label: "⚽ Cannonieri", desc: "Chi segna di più" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-gray-200 rounded-2xl p-6 text-center hover:border-brand-blue hover:shadow-md transition group"
          >
            <div className="text-2xl mb-2">{item.label.split(" ")[0]}</div>
            <div className="font-semibold text-brand-blue group-hover:text-brand-red transition text-sm">
              {item.label.split(" ").slice(1).join(" ")}
            </div>
            <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
          </Link>
        ))}
      </section>

      {/* Next match placeholder */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-brand-blue mb-6">Prossima Partita</h2>
          <div className="bg-white rounded-2xl shadow p-8 flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="text-center">
              <div className="font-bold text-lg text-brand-blue">Victoria Casa Hirta</div>
              <div className="text-xs text-gray-400 mt-1">Casa</div>
            </div>
            <div className="text-4xl font-extrabold text-brand-red">VS</div>
            <div className="text-center">
              <div className="font-bold text-lg text-gray-700">Avversario</div>
              <div className="text-xs text-gray-400 mt-1">Trasferta</div>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-4">I dati delle partite verranno caricati dal pannello admin</p>
        </div>
      </section>

    </div>
  );
}
