import { supabase } from "@/lib/supabase";

export const revalidate = 0;

interface Scorer {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  role: string;
  gol: number;
}

async function getScorers(): Promise<Scorer[]> {
  const { data: events } = await supabase
    .from("match_events")
    .select("player_id")
    .eq("event_type", "gol");

  if (!events || events.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.player_id] = (counts[e.player_id] ?? 0) + 1;
  }

  const playerIds = Object.keys(counts);

  const { data: players } = await supabase
    .from("players")
    .select("id, full_name, photo_url, role")
    .in("id", playerIds);

  if (!players) return [];

  return players
    .map(p => ({
      player_id: p.id,
      full_name: p.full_name,
      photo_url: p.photo_url,
      role: p.role,
      gol: counts[p.id] ?? 0,
    }))
    .sort((a, b) => b.gol - a.gol);
}

export default async function CannonierigPage() {
  const scorers = await getScorers();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Cannonieri</h1>
      <p className="text-gray-500 mb-10 text-sm">Classifica marcatori stagione in corso</p>

      {scorers.length === 0 && (
        <p className="text-gray-400 text-sm">I dati verranno aggiornati dopo le partite.</p>
      )}

      {scorers.length > 0 && (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-blue text-white text-xs uppercase tracking-widest">
                <th className="py-3 px-4 text-left w-8">#</th>
                <th className="py-3 px-4 text-left">Giocatore</th>
                <th className="py-3 px-4 text-center">⚽ Gol</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s, i) => (
                <tr
                  key={s.player_id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition ${i === 0 ? "bg-yellow-50" : ""}`}
                >
                  <td className="py-3 px-4 font-bold text-brand-red">{i + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">⚽</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-brand-blue">{s.full_name}</div>
                        <div className="text-xs text-gray-400 capitalize">{s.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-lg text-brand-red">{s.gol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
