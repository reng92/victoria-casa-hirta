import Link from "next/link";
import Image from "next/image";
import NextMatch from "@/components/NextMatch";

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="bg-brand-blue text-white py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <Image
            src="/logo.jpeg"
            alt="Victoria Casa Hirta"
            width={120}
            height={120}
            className="mx-auto mb-6 rounded-full"
            priority
          />
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
            Vedi il calendario →
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/rosa", emoji: "🧑‍🤝‍🧑", label: "Rosa", desc: "Tutti i giocatori" },
          { href: "/calendario", emoji: "📅", label: "Calendario", desc: "Partite e risultati" },
          { href: "/classifica", emoji: "🏆", label: "Classifica", desc: "La nostra posizione" },
          { href: "/cannonieri", emoji: "⚽", label: "Cannonieri", desc: "Chi segna di più" },
          { href: "/staff", emoji: "🧑‍💼", label: "Staff", desc: "Il nostro team" },
          { href: "/storico", emoji: "📚", label: "Storico", desc: "Stagioni passate" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-gray-200 rounded-2xl p-6 text-center hover:border-brand-blue hover:shadow-md transition group"
          >
            <div className="text-3xl mb-2">{item.emoji}</div>
            <div className="font-semibold text-brand-blue group-hover:text-brand-red transition text-sm">
              {item.label}
            </div>
            <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
          </Link>
        ))}
      </section>

      {/* Next match da Supabase */}
      <NextMatch />

      {/* Social section */}
      <section className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-brand-blue mb-4">
          Seguici sui social
        </h2>
        <p className="text-gray-600 mb-6">
          Resta aggiornato con foto, notizie e risultati in tempo reale
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://www.facebook.com/victoriacasahirta/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-blue text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
          >
            Facebook
          </a>
          <a
            href="https://www.instagram.com/victoriacasahirta"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-red text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
          >
            Instagram
          </a>
        </div>
      </section>

    </div>
  );
}
