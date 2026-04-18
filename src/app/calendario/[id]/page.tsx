import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MVPVoting from "@/components/MVPVoting";
import Formation from "@/components/Formation";
import WeatherWidget from "@/components/WeatherWidget";

export const revalidate = 60;

interface Match {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
  matchday: number | null;
  notes: string | null;
  opponent_logo_url: string | null;
  instagram_reels: string[] | null;
  live_minute: number | null;
  live_period: string | null;
  venue: { name: string; address: string; city: string | null; maps_url: string | null } | null;
  competition: { name: string; type: string | null; level: string | null } | null;
}

interface MatchEvent {
  id: string;
  event_type: string;
  minute: number | null;
  for_team: string | null;
  player: { full_name: string; shirt_number: number | null } | null;
  player_out: { full_name: string } | null;
}

async function getMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, notes, opponent_logo_url, instagram_reels, live_minute, live_period, venue:venues(name, address, city, maps_url), competition:competitions(name, type, level)")
    .eq("id", id)
    .single();
  if (error) {
    const { data: fallback } = await supabase
      .from("matches")
      .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, notes, opponent_logo_url, live_minute, live_period, venue:venues(name, address, city, maps_url), competition:competitions(name, type, level)")
      .eq("id", id)
      .single();
    return fallback as unknown as Match | null;
  }
  return data as unknown as Match | null;
}

function getInstagramEmbedUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

async function getEvents(matchId: string): Promise<MatchEvent[]> {
  const { data } = await supabase
    .from("match_events")
    .select("id, event_type, minute, for_team, player:players!match_events_player_id_fkey(full_name, shirt_number), player_out:players!match_events_player_out_id_fkey(full_name)")
    .eq("match_id", matchId)
    .order("minute", { ascending: true });
  return (data as unknown as MatchEvent[]) ?? [];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

const eventEmoji: Record<string, string> = {
  gol: "⚽",
  autorete: "🙈",
  assist: "🎯",
  ammonizione: "🟨",
  espulsione: "🟥",
  cambio: "🔄",
  rigore_segnato: "⚽✅",
  rigore_parato: "🧤",
  rigore_sbagliato: "❌",
};

const periodLabel: Record<string, string> = {
  first_half: "Primo tempo",
  half_time: "Intervallo",
  second_half: "Secondo tempo",
  extra_time: "Supplementari",
  finished: "Terminata",
};

export default async function PartitaPage({ params }: { params: { id: string } }) {
  const match = await getMatch(params.id);

  if (!match) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Partita non trovata.</p>
        <Link href="/calendario" className="text-brand-blue hover:text-brand-red text-sm mt-4 inline-block">
          ← Torna al calendario
        </Link>
      </div>
    );
  }

  const events = await getEvents(match.id);
  const ourScore = match.is_home ? match.home_score : match.away_score;
  const theirScore = match.is_home ? match.away_score : match.home_score;
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";

  const vchEvents = events.filter(e => e.for_team === "vch" || e.for_team === null);
  const oppEvents = events.filter(e => e.for_team === "opponent");

  let resultColor = "text-gray-500";
  let resultLabel = "";
  if (isFinished && ourScore !== null && theirScore !== null) {
    if (ourScore > theirScore) { resultColor = "text-green-600"; resultLabel = "VITTORIA"; }
    else if (ourScore < theirScore) { resultColor = "text-red-600"; resultLabel = "SCONFITTA"; }
    else { resultColor = "text-yellow-600"; resultLabel = "PAREGGIO"; }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/calendario" className="text-sm text-gray-400 hover:text-brand-blue transition mb-6 inline-block">
        ← Calendario
      </Link>

      {/* Header partita */}
      <div className="bg-brand-blue text-white rounded-2xl overflow-hidden shadow-lg mb-6">

        {/* Competition + status */}
        <div className="flex items-center justify-between px-6 py-3 bg-black/20 text-xs">
          <span className="font-semibold uppercase tracking-widest text-white/80">
            {match.competition?.name ?? "Amichevole"}
            {match.matchday ? ` · Giornata ${match.matchday}` : ""}
          </span>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1 bg-brand-red px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                LIVE {match.live_minute ? `${match.live_minute}'` : ""}
              </span>
            )}
            {isFinished && resultLabel && (
              <span className={`font-extrabold text-sm ${resultColor}`}>{resultLabel}</span>
            )}
            {!isFinished && !isLive && (
              <span className="text-white/60">Programmata</span>
            )}
          </div>
        </div>

        {/* Teams & Score */}
        <div className="px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            {/* VCH */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-lg">
                <img src="/logo.jpeg" alt="VCH" className="w-full h-full object-contain p-1" />
              </div>
              <span className="text-sm font-bold text-center leading-tight">
                Victoria Casa Hirta
              </span>
              <span className="text-xs text-white/50">{match.is_home ? "Casa" : "Ospite"}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center shrink-0">
              {isFinished || isLive ? (
                <div className="text-center">
                  <div className="text-5xl font-extrabold tabular-nums tracking-tight">
                    {ourScore ?? 0}
                    <span className="text-white/30 mx-3">–</span>
                    {theirScore ?? 0}
                  </div>
                  {isLive && match.live_period && (
                    <div className="text-xs text-white/60 mt-1 text-center">
                      {periodLabel[match.live_period] ?? "In corso"}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-white/30">VS</div>
                  <div className="text-sm font-bold mt-1">{formatTime(match.match_date)}</div>
                </div>
              )}
            </div>

            {/* Avversario */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-lg">
                {match.opponent_logo_url ? (
                  <img src={match.opponent_logo_url} alt={match.away_team} className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-4xl">⚽</span>
                )}
              </div>
              <span className="text-sm font-bold text-center leading-tight">
                {match.is_home ? match.away_team : match.home_team}
              </span>
              <span className="text-xs text-white/50">{match.is_home ? "Ospite" : "Casa"}</span>
            </div>
          </div>
        </div>

        {/* Date & venue */}
        <div className="px-6 py-4 bg-black/10 text-center space-y-1">
          <p className="text-sm text-white/80 capitalize font-medium">
            📅 {formatDate(match.match_date)}
            {!isFinished && !isLive ? ` · ${formatTime(match.match_date)}` : ""}
          </p>
          {match.venue && (
            <p className="text-xs text-white/50">
              📍 {match.venue.name}{match.venue.city ? ` · ${match.venue.city}` : ""}
            </p>
          )}
        </div>
      </div>

      {match.venue?.city && (
        <WeatherWidget
          matchDate={match.match_date}
          city={match.venue.city}
        />
      )}

      <Formation matchId={match.id} />

      {/* Tabellino eventi */}
      {events.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-brand-blue text-lg">📋 Tabellino</h2>
          </div>

          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {/* VCH events */}
            <div className="px-4 py-4">
              <div className="text-xs font-bold text-brand-blue uppercase tracking-wide mb-3 text-center">
                VCH
              </div>
              <div className="flex flex-col gap-2">
                {vchEvents.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center">–</p>
                ) : (
                  vchEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-2 text-sm">
                      <span className="text-base">{eventEmoji[ev.event_type] ?? "📋"}</span>
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-800 text-xs block truncate">
                          {ev.player?.full_name ?? "–"}
                        </span>
                        {ev.player_out && (
                          <span className="text-xs text-gray-400 block">↑ {ev.player_out.full_name}</span>
                        )}
                      </div>
                      {ev.minute && (
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{ev.minute}'</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Opponent events */}
            <div className="px-4 py-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 text-center">
                {match.is_home ? match.away_team : match.home_team}
              </div>
              <div className="flex flex-col gap-2">
                {oppEvents.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center">–</p>
                ) : (
                  oppEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-2 text-sm justify-end">
                      {ev.minute && (
                        <span className="text-xs text-gray-400 shrink-0">{ev.minute}'</span>
                      )}
                      <div className="min-w-0 text-right">
                        <span className="font-semibold text-gray-800 text-xs block truncate">
                          {ev.player?.full_name ?? match.away_team}
                        </span>
                      </div>
                      <span className="text-base">{eventEmoji[ev.event_type] ?? "📋"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instagram Reels */}
      {match.instagram_reels && match.instagram_reels.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <h2 className="font-bold text-brand-blue text-lg">Reels & Video</h2>
          </div>
          <div className="p-4 flex flex-col gap-6">
            {match.instagram_reels.map((url, i) => {
              const embedUrl = getInstagramEmbedUrl(url);
              return (
                <div key={i} className="w-full">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="w-full rounded-xl border-0"
                      height="500"
                      scrolling="no"
                      allowTransparency={true}
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      title={`Reel ${i + 1}`}
                    />
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
                      style={{ background: "linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)" }}
                    >
                      Apri Reel {i + 1} su Instagram →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mappa campo */}
      {match.venue?.maps_url && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-brand-blue text-lg">🏟️ Campo</h2>
            <p className="text-sm text-gray-500 mt-0.5">{match.venue.name}{match.venue.address ? ` · ${match.venue.address}` : ""}</p>
          </div>
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(match.venue.address + (match.venue.city ? ", " + match.venue.city : ""))}&output=embed&z=15`}
            width="100%"
            height="200"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
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

      {isFinished && (
        <MVPVoting matchId={match.id} awayTeam={match.is_home ? match.away_team : match.home_team} />
      )}

      {/* Note */}
      {match.notes && (
        <div className="bg-gray-50 rounded-2xl p-5 text-sm text-gray-600 border border-gray-100">
          <p className="font-semibold text-brand-blue mb-1">Note</p>
          <p>{match.notes}</p>
        </div>
      )}

      {/* Condividi WhatsApp */}
      <div className="mt-6 text-center">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`VCH vs ${match.away_team} · ${formatDate(match.match_date)}${isFinished ? ` · ${ourScore}–${theirScore}` : ""} · victoriacasahirta.it/calendario/${match.id}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-500 text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Condividi su WhatsApp
        </a>
      </div>
    </div>
  );
}
