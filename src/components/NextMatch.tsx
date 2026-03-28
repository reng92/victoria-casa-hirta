import { supabase } from "@/lib/supabase";
import WeatherWidget from "@/components/WeatherWidget";

interface Match {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
  opponent_logo_url: string | null;
  venue: { name: string; address: string; city: string | null; maps_url: string | null } | null;
  competition: { name: string } | null;
}

async function getNextMatch(): Promise<Match | null> {
  const { data } = await supabase
    .from("matches")
    .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, opponent_logo_url, venue:venues(name, address, city, maps_url), competition:competitions(name)")
    .in("status", ["scheduled", "live"])
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
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMapsEmbedUrl(mapsUrl: string): string | null {
  try {
    const url = new URL(mapsUrl);
    const q = url.searchParams.get("q");
    if (q) return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(mapsUrl)}&output=embed`;
  } catch {
    return null;
  }
}

export default async function NextMatch() {
  const match = await getNextMatch();

  return (
    <section className="bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-brand-blue mb-6 text-center">Prossima Partita</h2>

        {!match ? (
          <div className="bg-white rounded-2xl shadow p-8 text-gray-400 text-sm text-center">
            Nessuna partita in programma al momento.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">

            {/* Competition badge */}
            {match.competition && (
              <div className="bg-brand-blue/5 border-b border-gray-100 px-6 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-brand-red">
                  {match.competition.name}
                </span>
                {match.status === "live" && (
                  <span className="flex items-center gap-1 text-xs font-bold text-brand-red">
                    <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse inline-block" />
                    LIVE
                  </span>
                )}
              </div>
            )}

            {/* Match card */}
            <div className="px-6 py-8">
              <div className="flex items-center justify-between gap-4">

                {/* VCH */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-blue flex items-center justify-center shadow">
                    <img src="/logo.jpeg" alt="VCH" className="w-full h-full object-contain p-1" />
                  </div>
                  <span className="text-sm font-bold text-brand-blue text-center leading-tight">
                    Victoria Casa Hirta
                  </span>
                  <span className="text-xs text-gray-400">{match.is_home ? "Casa" : "Ospite"}</span>
                </div>

                {/* Score / VS */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  {match.status === "live" || match.status === "finished" ? (
                    <div className="text-4xl font-extrabold text-brand-blue tracking-tight">
                      {match.is_home ? match.home_score ?? 0 : match.away_score ?? 0}
                      <span className="text-gray-300 mx-2">–</span>
                      {match.is_home ? match.away_score ?? 0 : match.home_score ?? 0}
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-extrabold text-gray-200">VS</div>
                      <div className="text-xs text-gray-500 font-medium mt-1">
                        {formatTime(match.match_date)}
                      </div>
                    </>
                  )}
                </div>

                {/* Avversario */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shadow">
                    {match.opponent_logo_url ? (
                      <img src={match.opponent_logo_url} alt={match.away_team} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-3xl">⚽</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-700 text-center leading-tight">
                    {match.is_home ? match.away_team : match.home_team}
                  </span>
                  <span className="text-xs text-gray-400">{match.is_home ? "Ospite" : "Casa"}</span>
                </div>

              </div>

              {/* Date & venue */}
              <div className="mt-6 pt-4 border-t border-gray-100 text-center space-y-1">
                <p className="text-sm font-medium text-gray-700 capitalize">
                  📅 {formatDate(match.match_date)}
                </p>
                {match.venue && (
                  <p className="text-xs text-gray-400">
                    📍 {match.venue.name}
                    {match.venue.city ? ` · ${match.venue.city}` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Mappa Google */}
            {match.venue?.maps_url && (
              <div className="border-t border-gray-100">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(match.venue.address + (match.venue.city ? ", " + match.venue.city : ""))}&output=embed&z=15`}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full"
                />
                <a
                  href={match.venue.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-brand-blue hover:text-brand-red transition border-t border-gray-100"
                >
                  🗺️ Apri in Google Maps
                </a>
              </div>
            )}

            {match.venue?.city && (
              <div className="border-t border-gray-100 p-4">
                <WeatherWidget
                  matchDate={match.match_date}
                  city={match.venue?.city ?? "Caserta"}
                />
              </div>
            )}

          </div>
        )}
      </div>
    </section>
  );
}
