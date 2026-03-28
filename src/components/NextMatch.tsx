import { supabase } from "@/lib/supabase";

interface Match {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  status: string;
  venue: { name: string; address: string } | null;
  competition: { name: string } | null;
}

async function getNextMatch(): Promise<Match | null> {
  const { data } = await supabase
    .from("matches")
    .select("id, match_date, home_team, away_team, is_home, status, venue:venues(name, address), competition:competitions(name)")
    .eq("status", "scheduled")
    .gte("match_date", new Date().toISOString())
    .order("match_date", { ascending: true })
    .limit(1)
    .single();
  return data as unknown as Match | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NextMatch() {
  const match = await getNextMatch();

  return (
    <section className="bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-brand-blue mb-6">Prossima Partita</h2>

        {!match ? (
          <div className="bg-white rounded-2xl shadow p-8 text-gray-400 text-sm">
            Nessuna partita in programma al momento.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md p-8">
            {match.competition && (
              <div className="text-xs font-semibold uppercase tracking-widest text-brand-red mb-4">
                {match.competition.name}
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="font-bold text-xl text-brand-blue">
                  {match.is_home ? "Victoria Casa Hirta" : match.away_team}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {match.is_home ? "Casa" : "Ospite"}
                </div>
              </div>
              <div className="text-4xl font-extrabold text-brand-red">VS</div>
              <div className="text-center">
                <div className="font-bold text-xl text-gray-700">
                  {match.is_home ? match.away_team : "Victoria Casa Hirta"}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {match.is_home ? "Ospite" : "Casa"}
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500 space-y-1">
              <p>📅 {formatDate(match.match_date)} alle {formatTime(match.match_date)}</p>
              {match.venue && <p>📍 {match.venue.name} – {match.venue.address}</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
