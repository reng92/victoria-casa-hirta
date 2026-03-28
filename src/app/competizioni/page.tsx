import { supabase } from "@/lib/supabase";

export const revalidate = 60;

interface Competition {
  id: string;
  name: string;
  type: string | null;
  level: string | null;
  organizer: string | null;
  logo_url: string | null;
  season: { name: string } | null;
}

async function getCompetitions(): Promise<Competition[]> {
  const { data } = await supabase
    .from("competitions")
    .select("*, season:seasons(name)")
    .order("name", { ascending: true });
  return (data as Competition[]) ?? [];
}

const levelLabel: Record<string, string> = {
  provinciale: "Provinciale",
  regionale: "Regionale",
  nazionale: "Nazionale",
};

const typeLabel: Record<string, string> = {
  campionato: "Campionato",
  coppa: "Coppa",
  torneo: "Torneo",
};

export default async function CompetizioniPage() {
  const competitions = await getCompetitions();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Competizioni</h1>
      <p className="text-gray-500 mb-10 text-sm">Campionati e coppe a cui partecipiamo</p>

      {competitions.length === 0 && (
        <p className="text-gray-400 text-sm">Le competizioni verranno caricate a breve.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {competitions.map((c) => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition flex gap-4 items-start">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
              {c.logo_url ? (
                <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🏆</span>
              )}
            </div>
            <div>
              <h2 className="font-bold text-brand-blue text-lg leading-tight mb-1">{c.name}</h2>
              <div className="flex flex-wrap gap-2 mb-2">
                {c.type && (
                  <span className="text-xs bg-brand-blue text-white px-2 py-0.5 rounded-full">
                    {typeLabel[c.type] ?? c.type}
                  </span>
                )}
                {c.level && (
                  <span className="text-xs bg-brand-red text-white px-2 py-0.5 rounded-full">
                    {levelLabel[c.level] ?? c.level}
                  </span>
                )}
              </div>
              {c.organizer && <p className="text-xs text-gray-400">Organizzatore: {c.organizer}</p>}
              {c.season && <p className="text-xs text-gray-400">Stagione: {c.season.name}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
