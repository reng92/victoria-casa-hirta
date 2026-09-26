import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { History, Trophy, ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import TeamLogo from "@/components/ui/TeamLogo";
import { Pill } from "@/components/ui/Badge";
import { formatDateNumeric, getOutcome, outcomeShort } from "@/lib/format";
import { formatLabel, getHomeAwayScores, getOpponent, getScores, groupLabel, isVCH, matchdayLabel, sortStandings } from "@/lib/competitions";
import { matchHref } from "@/lib/links";

export const revalidate = 60;

interface Season {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

interface Competition {
  id: string;
  name: string;
  type: string | null;
  format: string | null;
  status: string | null;
  notes: string | null;
  season_id: string | null;
}

interface Match {
  slug?: string | null;
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
  matchday: number | null;
  group_name: string | null;
  notes: string | null;
  opponent_logo_url: string | null;
  competition_id: string | null;
}

interface Standing {
  id: string;
  team_name: string;
  group_name: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
  competition_id: string | null;
}

async function getAll() {
  const [{ data: seasons }, { data: competitions }, { data: matches }, { data: standings }] = await Promise.all([
    supabase.from("seasons").select("*").order("start_date", { ascending: false }),
    supabase.from("competitions").select("id, name, type, format, status, notes, season_id"),
    supabase
      .from("matches")
      .select("id, slug, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, group_name, notes, opponent_logo_url, competition_id")
      .eq("status", "finished")
      .order("match_date", { ascending: true }),
    supabase.from("standings").select("*"),
  ]);
  return {
    seasons: (seasons as Season[]) ?? [],
    competitions: (competitions as Competition[]) ?? [],
    matches: (matches as unknown as Match[]) ?? [],
    standings: sortStandings((standings as unknown as Standing[]) ?? []),
  };
}

const typeLabel: Record<string, string> = { campionato: "Campionato", coppa: "Coppa", torneo: "Torneo" };

function ordinal(n: number) {
  return `${n}ª`;
}

/** Riepilogo V/N/P e posizione finale della Victoria in una competizione. */
function CompetitionSection({ comp, matches, standings }: { comp: Competition; matches: Match[]; standings: Standing[] }) {
  const results = matches.map((m) => getOutcome(getScores(m).ours, getScores(m).theirs));
  const wins = results.filter((r) => r === "win").length;
  const draws = results.filter((r) => r === "draw").length;
  const losses = results.filter((r) => r === "loss").length;

  // Posizione finale: nel girone della Victoria (se a gironi), altrimenti nella classifica unica
  const vchRow = standings.find((s) => isVCH(s.team_name));
  const tableRows = vchRow ? standings.filter((s) => (s.group_name ?? null) === (vchRow.group_name ?? null)) : standings;
  const position = vchRow ? tableRows.findIndex((s) => isVCH(s.team_name)) + 1 : 0;

  return (
    <article className="bento-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold leading-tight">{comp.name}</h3>
          <p className="text-[11px] text-muted mt-0.5">
            {[comp.type && typeLabel[comp.type], comp.format && formatLabel[comp.format]].filter(Boolean).join(" · ")}
          </p>
        </div>
        {position > 0 && (
          <Pill tone={position === 1 ? "win" : "brand"} className="normal-case tracking-normal">
            <Trophy className="w-3 h-3" aria-hidden />
            {ordinal(position)} su {tableRows.length}
            {vchRow?.group_name ? ` · ${groupLabel(vchRow.group_name)}` : ""}
          </Pill>
        )}
        <div className="flex items-center gap-1.5">
          <Pill tone="win" className="!px-2">{wins}V</Pill>
          <Pill tone="draw" className="!px-2">{draws}N</Pill>
          <Pill tone="loss" className="!px-2">{losses}P</Pill>
        </div>
      </div>

      {comp.notes && <p className="px-5 pt-3 text-xs text-muted">{comp.notes}</p>}

      {/* Classifica finale compatta */}
      {tableRows.length > 0 && (
        <ol className="px-5 pt-3 flex flex-col gap-1">
          {tableRows.map((s, i) => {
            const vch = isVCH(s.team_name);
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-lg px-2 py-1 text-xs ${vch ? "bg-brand/40 border-l-2 border-accent font-semibold" : ""}`}
              >
                <span className="w-5 text-muted tabular text-center">{i + 1}</span>
                <span className="flex-1 truncate">{s.team_name}</span>
                <span className="text-muted tabular hidden xs:inline">{s.played} g · {s.goals_for}:{s.goals_against}</span>
                <span className="font-display font-bold tabular w-7 text-right">{s.points}</span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Partite */}
      <ul className="p-3 flex flex-col gap-1.5">
        {matches.map((m) => {
          const { ours, theirs } = getScores(m);
          const outcome = getOutcome(ours, theirs);
          const color = outcome === "win" ? "text-win" : outcome === "loss" ? "text-loss" : outcome === "draw" ? "text-draw" : "text-muted";
          const border = outcome === "win" ? "border-l-win" : outcome === "loss" ? "border-l-loss" : outcome === "draw" ? "border-l-draw" : "border-l-border";
          const opponent = getOpponent(m);
          const context = [groupLabel(m.group_name), matchdayLabel(m.matchday), !m.matchday && m.notes ? m.notes.split(".")[0] : null]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={m.id}>
              <Link
                href={matchHref(m)}
                className={`flex items-center gap-3 rounded-xl border-l-4 ${border} bg-surface-2/40 hover:bg-surface-2/80 tap px-3 py-2 text-sm`}
              >
                <TeamLogo src={m.opponent_logo_url} name={opponent} size={28} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold truncate">
                    {opponent}
                    <span className="text-muted font-normal text-xs ml-2">{m.is_home ? "casa" : "trasferta"}</span>
                  </span>
                  <span className="text-[11px] text-muted truncate">
                    {formatDateNumeric(m.match_date)}{context ? ` · ${context}` : ""}
                  </span>
                </div>
                <span className={`font-display text-lg font-bold tabular leading-none ${color}`}>
                  {getHomeAwayScores(m).home ?? "–"}<span className="text-muted mx-1 font-normal">–</span>{getHomeAwayScores(m).away ?? "–"}
                </span>
                <span className={`w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[11px] font-bold ${color}`}>
                  {outcome ? outcomeShort[outcome] : "–"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default async function StoricoPage() {
  const { seasons, competitions, matches, standings } = await getAll();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Storico Stagioni" subtitle="Risultati e classifiche finali, stagione per stagione" />

      {seasons.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={History} title="Nessuna stagione" description="Lo storico verrà popolato con le prossime stagioni." />
        </div>
      )}

      {seasons.map((season) => {
        const comps = competitions.filter((c) => c.season_id === season.id);
        const seasonMatches = matches.filter((m) => comps.some((c) => c.id === m.competition_id));
        const results = seasonMatches.map((m) => getOutcome(getScores(m).ours, getScores(m).theirs));
        const wins = results.filter((r) => r === "win").length;
        const draws = results.filter((r) => r === "draw").length;
        const losses = results.filter((r) => r === "loss").length;

        return (
          <section key={season.id} className="mb-12" aria-labelledby={`season-${season.id}`}>
            <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
              <h2 id={`season-${season.id}`} className="font-display text-h2">{season.name}</h2>
              {season.is_current && <Pill tone="accent">In corso</Pill>}
              {seasonMatches.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-muted tabular mr-1">{seasonMatches.length} partite</span>
                  <Pill tone="win" className="!px-2">{wins}V</Pill>
                  <Pill tone="draw" className="!px-2">{draws}N</Pill>
                  <Pill tone="loss" className="!px-2">{losses}P</Pill>
                </div>
              )}
            </div>

            {comps.length === 0 ? (
              <div className="bento-card">
                <EmptyState compact icon={History} title="Nessuna competizione" description="Nessuna competizione registrata per questa stagione." />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {comps
                  .map((c) => ({ c, ms: seasonMatches.filter((m) => m.competition_id === c.id) }))
                  .sort((a, b) => {
                    const da = a.ms[0]?.match_date ?? "9";
                    const db = b.ms[0]?.match_date ?? "9";
                    return da.localeCompare(db);
                  })
                  .map(({ c, ms }) =>
                    ms.length === 0 ? (
                      <article key={c.id} className="bento-card px-5 py-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-display text-base font-bold">{c.name}</h3>
                          <p className="text-[11px] text-muted">Nessuna partita giocata finora.</p>
                        </div>
                        {season.is_current && (
                          <Link href="/calendario" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-soft hover:text-text transition">
                            Calendario <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                          </Link>
                        )}
                      </article>
                    ) : (
                      <CompetitionSection
                        key={c.id}
                        comp={c}
                        matches={ms}
                        standings={standings.filter((s) => s.competition_id === c.id)}
                      />
                    )
                  )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
