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
  venue: { name: string } | null;
  competition: { id: string; name: string } | null;
}

interface Competition {
  id: string;
  name: string;
}

async function getMatches(): Promise<Match[]> {
  const { data } = await supabase
    .from("matches")
    .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, opponent_logo_url, venue:venues(name), competition:competitions(id, name)")
    .order("match_date", { ascending: true });
  return (data as unknown as Match[]) ?? [];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", {
    hour: "2-digit", minute: "2-digit",
  });
}

function MatchCard({ match }: { match: Match }) {
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const isHome = match.is_home;

  const ourTeam = "Victoria Casa Hirta";
  const opponent = isHome ? match.away_team : match.home_team;
  const ourScore = isHome ? match.home_score : match.away_score;
  const theirScore = isHome ? match.away_score : match.home_score;

  let resultColor = "bg-gray-100 text-gray-500";
  if (isFinished && ourScore !== null && theirScore !== null) {
    if (ourScore > theirScore) resultColor = "bg-green-100 text-green-700";
    else if (ourScore < theirScore) resultColor = "bg-red-100 text-red-700";
    else resultColor = "bg-yellow-100 text-yellow-700";
  }

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
          <span className="font-bold text-brand-blue text-sm">{ourTeam}</span>
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
        {isLive && (
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse inline-block" />
            <span className="text-brand-red font-bold text-lg">
              {ourScore ?? 0} – {theirScore ?? 0}
            </span>
          </div>
        )}
        {isFinished && ourScore !== null && theirScore !== null && (
          <span className={`inline-block px-4 py-1 rounded-full font-bold text-lg ${resultColor}`}>
            {ourScore} – {theirScore}
          </span>
        )}
        {!isFinished && !isLive && (
          <span className="text-sm text-gray-400 font-medium">
            {formatTime(match.match_date)}
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function CalendarioPage() {
  const matches = await getMatches();

  const competitions: Competition[] = Array.from(
    new Map(
      matches
        .filter(m => m.competition)
        .map(m => [m.competition!.id, m.competition!])
    ).values()
  );

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
          <div className="flex flex-col gap-3">
            {[...played].reverse().map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
