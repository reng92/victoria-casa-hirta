import Link from "next/link";

const sections = [
  { href: "/admin/partite", emoji: "📅", label: "Partite", desc: "Aggiungi e gestisci le partite" },
  { href: "/admin/marcatori", emoji: "⚽", label: "Marcatori", desc: "Gol, assist e cartellini" },
  { href: "/admin/rosa", emoji: "👥", label: "Rosa", desc: "Gestisci i giocatori" },
  { href: "/admin/staff", emoji: "🧑‍💼", label: "Staff", desc: "Gestisci lo staff tecnico" },
  { href: "/admin/competizioni", emoji: "🏆", label: "Competizioni", desc: "Campionati e coppe" },
  { href: "/admin/classifica", emoji: "📊", label: "Classifica", desc: "Aggiorna le classifiche" },
  { href: "/admin/campi", emoji: "🏟️", label: "Campi", desc: "Gestisci i campi di gioco" },
  { href: "/admin/news", emoji: "📰", label: "News", desc: "Pubblica comunicati" },
  { href: "/admin/stagioni", emoji: "📆", label: "Stagioni", desc: "Gestisci le stagioni" },
  { href: "/admin/sponsors", emoji: "💰", label: "Sponsor", desc: "Gestisci gli sponsor" },
  { href: "/admin/galleria", emoji: "📸", label: "Galleria", desc: "Carica foto partite" },
  { href: "/admin/presenze", emoji: "📋", label: "Presenze", desc: "Gestisci le presenze per partita" },
  { href: "/admin/formazione", emoji: "🟩", label: "Formazione", desc: "Schema tattico e posizioni" },
];

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">⚙️</span>
        <h1 className="text-3xl font-extrabold text-brand-blue">Pannello Admin</h1>
      </div>
      <p className="text-gray-500 mb-10 text-sm">Gestisci tutti i contenuti del sito</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white border border-gray-100 rounded-2xl p-5 text-center hover:border-brand-blue hover:shadow-md transition group"
          >
            <div className="text-3xl mb-2">{s.emoji}</div>
            <div className="font-semibold text-brand-blue group-hover:text-brand-red transition text-sm">
              {s.label}
            </div>
            <div className="text-xs text-gray-400 mt-1">{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
