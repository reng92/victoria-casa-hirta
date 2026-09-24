import { supabase } from "@/lib/supabase";
import { History } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Badge";
import { formatDateNumeric, getOutcome, outcomeShort } from "@/lib/format";

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

const outcomeText = { win: "text-win", draw: "text-draw", loss: "text-loss" } as const;
const outcomeBorder = { win: "border-l-win", draw: "border-l-draw", loss: "border-l-loss" } as const;

export default async function StoricoPage() {
  const seasons = await getAll();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Storico Stagioni" subtitle="Archivio risultati per stagione" />

      {seasons.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={History} title="Nessuna stagione" description="Lo storico verrà popolato con le prossime stagioni." />
        </div>
      )}

      {seasons.map((season) => {
        const wins = season.matches.filter(m => getResult(m).label === "V").length;
        const draws = season.matches.filter(m => getResult(m).label === "N").length;
        const losses = season.matches.filter(m => getResult(m).label === "P").length;

        return (
          <section key={season.id} className="mb-10" aria-labelledby={`season-${season.id}`}>
            <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
              <h2 id={`season-${season.id}`} className="font-display text-h3">{season.name}</h2>
              {season.is_current && <Pill tone="accent">In corso</Pill>}
              {season.matches.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-muted tabular mr-1">{season.matches.length} partite</span>
                  <Pill tone="win" className="!px-2">{wins}V</Pill>
                  <Pill tone="draw" className="!px-2">{draws}N</Pill>
                  <Pill tone="loss" className="!px-2">{losses}P</Pill>
                </div>
              )}
            </div>

            {season.matches.length === 0 ? (
              <div className="bento-card">
                <EmptyState compact icon={History} title="Nessun risultato" description="Nessuna partita giocata in questa stagione." />
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {season.matches.map((m) => {
                  const result = getResult(m);
                  const ours = m.is_home ? m.home_score : m.away_score;
                  const theirs = m.is_home ? m.away_score : m.home_score;
                  const outcome = getOutcome(ours, theirs);
                  const color = outcome ? outcomeText[outcome] : "text-muted";
                  const border = outcome ? `border-l-4 ${outcomeBorder[outcome]}` : "";
                  return (
                    <li
                      key={m.id}
                      className={`bento-card px-4 py-3 flex items-center justify-between gap-3 text-sm ${border}`}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold truncate">VCH vs {m.away_team}</span>
                          <Pill tone={m.is_home ? "brand" : "neutral"} className="!py-px shrink-0">
                            {m.is_home ? "Casa" : "Trasferta"}
                          </Pill>
                        </div>
                        <span className="text-xs text-muted truncate">
                          {formatDateNumeric(m.match_date)}
                          {m.competition ? ` · ${m.competition.name}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-display text-xl font-bold tabular leading-none ${color}`}>
                          {ours ?? "–"}<span className="text-muted mx-1 font-normal">–</span>{theirs ?? "–"}
                        </span>
                        <span
                          className={`w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold ${color}`}
                          aria-label={outcome === "win" ? "Vittoria" : outcome === "loss" ? "Sconfitta" : outcome === "draw" ? "Pareggio" : "Risultato non disponibile"}
                        >
                          {outcome ? outcomeShort[outcome] : result.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
