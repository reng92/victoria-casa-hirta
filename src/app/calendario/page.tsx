import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
  opponent_logo_url: string | null;
  instagram_reels: string[] | null;
  venue: { name: string } | null;
  competition: { id: string; name: string } | null;
}

async function getMatches(): Promise<Match[]> {
  const { data } = await supabase
    .from("matches")
    .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, opponent_logo_url, instagram_reels, venue:venues(name), competition:competitions(id, name)")
    .order("match_date", { ascending: true });
  return (data as unknown as Match[]) ?? [];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "numeric", month: "short",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", {
    hour: "2-digit", minute: "2-digit",
  });
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const isHome = match.is_home;
  const opponent = isHome ? match.away_team : match.home_team;
  const ourScore = isHome ? match.home_score : match.away_score;
  const theirScore = isHome ? match.away_score : match.home_score;

  return (
    <Link href={`/calendario/${match.id}`} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-brand-blue transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 block">
      <div className="flex flex-col gap-1 min-w-0">
        {match.competition && (
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-red">
            {match.competition.name}
            {match.matchday ? ` · Giornata ${match.matchday}` : ""}
          </span>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {match.opponent_logo_url && (
            <img src={match.opponent_logo_url} alt={opponent} className="w-6 h-6 object-contain rounded" />
          )}
          <span className="font-bold text-brand-blue text-sm">Victoria Casa Hirta</span>
          <span className="text-gray-400 text-xs">vs</span>
          <span className="font-semibold text-gray-700 text-sm">{opponent}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isHome ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-500"}`}>
            {isHome ? "Casa" : "Trasferta"}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          📅 {formatDate(match.match_date)} · {formatTime(match.match_date)}
          {match.venue ? ` · ${match.venue.name}` : ""}
        </div>
      </div>
      <div className="shrink-0 text-center">
        {isLive ? (
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse inline-block" />
            <span className="text-brand-red font-bold text-lg">{ourScore ?? 0} – {theirScore ?? 0}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 font-medium">{formatTime(match.match_date)}</span>
        )}
      </div>
    </Link>
  );
}

function ResultCard({ match }: { match: Match }) {
  const isHome = match.is_home;
  const opponent = isHome ? match.away_team : match.home_team;
  const ourScore = isHome ? match.home_score : match.away_score;
  const theirScore = isHome ? match.away_score : match.home_score;
  const hasReels = match.instagram_reels && match.instagram_reels.length > 0;

  let result: "win" | "loss" | "draw" | null = null;
  if (ourScore !== null && theirScore !== null) {
    if (ourScore > theirScore) result = "win";
    else if (ourScore < theirScore) result = "loss";
    else result = "draw";
  }

  const styles = {
    win:  { stripe: "border-l-green-500",  bg: "from-green-50/70 to-white",  badge: "bg-green-100 text-green-700",  score: "text-green-600",  label: "VITTORIA"  },
    loss: { stripe: "border-l-red-500",    bg: "from-red-50/70 to-white",    badge: "bg-red-100 text-red-600",     score: "text-red-600",    label: "SCONFITTA" },
    draw: { stripe: "border-l-yellow-400", bg: "from-yellow-50/70 to-white", badge: "bg-yellow-100 text-yellow-700", score: "text-yellow-600", label: "PAREGGIO" },
  };
  const s = result
    ? styles[result]
    : { stripe: "border-l-gray-200", bg: "from-gray-50/50 to-white", badge: "bg-gray-100 text-gray-500", score: "text-gray-600", label: "" };

  return (
    <Link
      href={`/calendario/${match.id}`}
      className={`bg-gradient-to-r ${s.bg} border border-gray-100 border-l-4 ${s.stripe} rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group block`}
    >
      <div className="p-5">
        {/* Competition + date */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand-red truncate mr-2">
            {match.competition?.name ?? "Amichevole"}
            {match.matchday ? ` · G${match.matchday}` : ""}
          </span>
          <span className="text-xs text-gray-400 font-medium shrink-0">{formatDate(match.match_date)}</span>
        </div>

        {/* Logos + score */}
        <div className="flex items-center justify-between gap-3">
          {/* VCH */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-md flex items-center justify-center border border-gray-100">
              <img src="/logo.jpeg" alt="VCH" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wide">VCH</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={`text-4xl font-extrabold tabular-nums leading-none ${s.score}`}>
              <span>{ourScore ?? "–"}</span>
              <span className="text-gray-200 mx-2">–</span>
              <span>{theirScore ?? "–"}</span>
            </div>
            {result && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${s.badge}`}>
                {s.label}
              </span>
            )}
          </div>

          {/* Opponent */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-md flex items-center justify-center border border-gray-100">
              {match.opponent_logo_url ? (
                <img src={match.opponent_logo_url} alt={opponent} className="w-full h-full object-contain p-0.5" />
              ) : (
                <span className="text-sm font-bold text-gray-400">{opponent.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight truncate max-w-full px-1">{opponent}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
          <span className="text-xs text-gray-400">
            {isHome ? "🏠 Casa" : "✈️ Trasferta"}
          </span>
          <div className="flex items-center gap-2">
            {hasReels && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-pink-500 bg-pink-50 px-2.5 py-0.5 rounded-full">
                <InstagramIcon />
                {match.instagram_reels!.length} {match.instagram_reels!.length === 1 ? "reel" : "reels"}
              </span>
            )}
            <span className="text-xs text-gray-300 group-hover:text-brand-blue transition font-bold">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function CalendarioPage() {
  const matches = await getMatches();
  const played = matches.filter((m) => m.status === "finished");
  const upcoming = matches.filter((m) => m.status !== "finished");

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Calendario</h1>
      <p className="text-gray-500 mb-6 text-sm">Partite disputate e in programma</p>

      {matches.length === 0 && (
        <p className="text-gray-400 text-sm">Il calendario verrà caricato a breve.</p>
      )}

      {upcoming.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-brand-blue mb-4 border-b border-gray-100 pb-2">
            Prossime partite
          </h2>
          <div className="flex flex-col gap-3">
            {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-brand-blue mb-4 border-b border-gray-100 pb-2">
            Risultati
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...played].reverse().map((m) => <ResultCard key={m.id} match={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
