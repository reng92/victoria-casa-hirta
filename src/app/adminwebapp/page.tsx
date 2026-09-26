import Link from "next/link";

const sections = [
  { href: "/adminwebapp/partite", emoji: "📅", label: "Partite", desc: "Aggiungi e gestisci le partite" },
  { href: "/adminwebapp/risultati", emoji: "📝", label: "Risultati", desc: "Tutte le partite di campionati e coppe" },
  { href: "/adminwebapp/marcatori", emoji: "⚽", label: "Marcatori", desc: "Gol, assist e cartellini" },
  { href: "/adminwebapp/rosa", emoji: "👥", label: "Rosa", desc: "Gestisci i giocatori" },
  { href: "/adminwebapp/staff", emoji: "🧑‍💼", label: "Staff", desc: "Gestisci lo staff tecnico" },
  { href: "/adminwebapp/competizioni", emoji: "🏆", label: "Competizioni", desc: "Campionati e coppe" },
  { href: "/adminwebapp/classifica", emoji: "📊", label: "Classifica", desc: "Aggiorna le classifiche" },
  { href: "/adminwebapp/campi", emoji: "🏟️", label: "Campi", desc: "Gestisci i campi di gioco" },
  { href: "/adminwebapp/news", emoji: "📰", label: "News", desc: "Pubblica comunicati" },
  { href: "/adminwebapp/stagioni", emoji: "📆", label: "Stagioni", desc: "Gestisci le stagioni" },
  { href: "/adminwebapp/sponsors", emoji: "💰", label: "Sponsor", desc: "Gestisci gli sponsor e i loro loghi" },
  { href: "/adminwebapp/loghi", emoji: "🛡️", label: "Loghi avversari", desc: "Un logo per ogni squadra affrontata" },
  { href: "/adminwebapp/galleria", emoji: "📸", label: "Galleria", desc: "Carica foto partite" },
  { href: "/adminwebapp/presenze", emoji: "📋", label: "Presenze", desc: "Gestisci le presenze per partita" },
  { href: "/adminwebapp/formazione", emoji: "🟩", label: "Formazione", desc: "Schema tattico e posizioni" },
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
