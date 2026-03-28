import { supabase } from "@/lib/supabase";

export const revalidate = 60;

interface Season {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

interface Match {
  id: string;
  match_date: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
  competition: { name: string } | null;
}

interface SeasonWithMatches extends Season {
  matches: Match[];
}

async function getAll(): Promise<SeasonWithMatches[]> {
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false });

  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_date, away_team, is_home, home_score, away_score, status, competition:competitions(name, season_id)")
    .eq("status", "finished")
    .order("match_date", { ascending: false });

  const allSeasons = (seasons as Season[]) ?? [];
  const allMatches = (matches as unknown as (Match & { competition: { name: string; season_id: string } | null })[]) ?? [];

  return allSeasons.map((season) => ({
    ...season,
    matches: allMatches.filter(
      (m) => m.competition?.season_id === season.id
    ),
  }));
}

function getResult(m: Match): { label: string; color: string } {
  if (m.home_score === null || m.away_score === null) return { label: "-", color: "text-gray-400" };
  const ours = m.is_home ? m.home_score : m.away_score;
  const theirs = m.is_home ? m.away_score : m.home_score;
  if (ours > theirs) return { label: "V", color: "text-green-600" };
  if (ours < theirs) return { label: "P", color: "text-red-600" };
  return { label: "N", color: "text-yellow-600" };
}

export default async function StoricoPage() {
  const seasons = await getAll();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Storico Stagioni</h1>
      <p className="text-gray-500 mb-10 text-sm">Archivio risultati per stagione</p>

      {seasons.length === 0 && (
        <p className="text-gray-400 text-sm">Nessuna stagione disponibile.</p>
      )}

      {seasons.map((season) => {
        const wins = season.matches.filter(m => getResult(m).label === "V").length;
        const draws = season.matches.filter(m => getResult(m).label === "N").length;
        const losses = season.matches.filter(m => getResult(m).label === "P").length;

        return (
          <div key={season.id} className="mb-12">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-brand-blue">{season.name}</h2>
              {season.is_current && (
                <span className="text-xs bg-brand-red text-white px-2 py-0.5 rounded-full">In corso</span>
              )}
              {season.matches.length > 0 && (
                <span className="text-xs text-gray-400 ml-auto">
                  {season.matches.length} partite · {wins}V {draws}N {losses}P
                </span>
              )}
            </div>

            {season.matches.length === 0 ? (
              <p className="text-gray-400 text-sm">Nessun risultato per questa stagione.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {season.matches.map((m) => {
                  const result = getResult(m);
                  const ours = m.is_home ? m.home_score : m.away_score;
                  const theirs = m.is_home ? m.away_score : m.home_score;
                  return (
                    <div
                      key={m.id}
                      className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm text-sm"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-brand-blue">
                          VCH vs {m.away_team}
                          <span className={`ml-2 text-xs ${m.is_home ? "text-brand-blue" : "text-gray-400"}`}>
                            {m.is_home ? "Casa" : "Trasferta"}
                          </span>
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(m.match_date).toLocaleDateString("it-IT")}
                          {m.competition ? ` · ${m.competition.name}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-700">{ours} – {theirs}</span>
                        <span className={`font-extrabold text-base ${result.color}`}>{result.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
