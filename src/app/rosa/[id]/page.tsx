import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 60;

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  birth_date: string | null;
  photo_url: string | null;
}

interface MatchEvent {
  id: string;
  event_type: string;
  minute: number | null;
  match: { match_date: string; away_team: string; home_score: number | null; away_score: number | null; is_home: boolean } | null;
}

async function getPlayer(id: string): Promise<Player | null> {
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();
  return data as unknown as Player | null;
}

async function getStats(playerId: string) {
  const { data: events } = await supabase
    .from("match_events")
    .select("id, event_type, minute, match:matches(match_date, away_team, home_score, away_score, is_home)")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  const { data: lineups } = await supabase
    .from("match_lineups")
    .select("id")
    .eq("player_id", playerId);

  const allEvents = (events as unknown as MatchEvent[]) ?? [];
  const gol = allEvents.filter(e => e.event_type === "gol").length;
  const assist = allEvents.filter(e => e.event_type === "assist").length;
  const ammonizioni = allEvents.filter(e => e.event_type === "ammonizione").length;
  const espulsioni = allEvents.filter(e => e.event_type === "espulsione").length;
  const presenze = lineups?.length ?? 0;

  return { gol, assist, ammonizioni, espulsioni, presenze, events: allEvents };
}

const roleLabel: Record<string, string> = {
  portiere: "Portiere",
  difensore: "Difensore",
  centrocampista: "Centrocampista",
  attaccante: "Attaccante",
};

const eventEmoji: Record<string, string> = {
  gol: "⚽",
  assist: "🎯",
  ammonizione: "🟨",
  espulsione: "🟥",
  cambio: "🔄",
  autorete: "🙈",
};

export default async function GiocatorePage({ params }: { params: { id: string } }) {
  const player = await getPlayer(params.id);
  if (!player) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Giocatore non trovato.</p>
        <Link href="/rosa" className="text-brand-blue text-sm mt-4 inline-block">← Rosa</Link>
      </div>
    );
  }

  const stats = await getStats(player.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/rosa" className="text-sm text-gray-400 hover:text-brand-blue transition mb-6 inline-block">
        ← Rosa
      </Link>

      {/* Header giocatore */}
      <div className="bg-brand-blue text-white rounded-2xl overflow-hidden shadow-lg mb-6">
        <div className="px-6 py-8 flex items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0 border-4 border-white/20">
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl">⚽</span>
            )}
          </div>
          <div>
            {player.shirt_number && (
              <div className="text-brand-red font-extrabold text-4xl leading-none mb-1">
                #{player.shirt_number}
              </div>
            )}
            <h1 className="text-2xl font-extrabold leading-tight">{player.full_name}</h1>
            <p className="text-white/60 text-sm mt-1">{roleLabel[player.role] ?? player.role}</p>
            {player.birth_date && (
              <p className="text-white/40 text-xs mt-0.5">
                Nato il {new Date(player.birth_date).toLocaleDateString("it-IT")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        {[
          { value: stats.presenze, label: "Presenze", emoji: "📋" },
          { value: stats.gol, label: "Gol", emoji: "⚽" },
          { value: stats.assist, label: "Assist", emoji: "🎯" },
          { value: stats.ammonizioni, label: "Ammonizioni", emoji: "🟨" },
          { value: stats.espulsioni, label: "Espulsioni", emoji: "🟥" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-2xl font-extrabold text-brand-blue">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Ultimi eventi */}
      {stats.events.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-brand-blue text-lg">📅 Ultimi eventi</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.events.slice(0, 10).map((ev) => (
              <div key={ev.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                <span className="text-xl">{eventEmoji[ev.event_type] ?? "📋"}</span>
                <div className="flex-1">
                  <span className="font-semibold text-gray-800 capitalize">{ev.event_type}</span>
                  {ev.match && (
                    <span className="text-gray-400 ml-2 text-xs">
                      vs {ev.match.away_team} · {new Date(ev.match.match_date).toLocaleDateString("it-IT")}
                    </span>
                  )}
                </div>
                {ev.minute && <span className="text-xs text-gray-400">{ev.minute}'</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
