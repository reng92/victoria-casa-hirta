import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { CalendarX, ChevronRight, Clapperboard } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import TeamLogo, { VCHLogo } from "@/components/ui/TeamLogo";
import { LiveBadge, Pill } from "@/components/ui/Badge";
import { formatDateShort, formatTime, formatWeekday, getOutcome, outcomeShort } from "@/lib/format";
import { getOpponent, groupLabel, matchdayLabel } from "@/lib/competitions";

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
  group_name: string | null;
  opponent_logo_url: string | null;
  instagram_reels: string[] | null;
  venue: { name: string } | null;
  competition: { id: string; name: string; format: string | null } | null;
}

async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, group_name, opponent_logo_url, instagram_reels, venue:venues(name), competition:competitions(id, name, format)")
    .order("match_date", { ascending: true });

  if (error) {
    // Fallback senza group_name / instagram_reels se le colonne non esistono ancora
    const { data: fallback } = await supabase
      .from("matches")
      .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, opponent_logo_url, venue:venues(name), competition:competitions(id, name)")
      .order("match_date", { ascending: true });
    return (fallback as unknown as Match[]) ?? [];
  }
  return (data as unknown as Match[]) ?? [];
}

interface RoundGroup {
  key: string;
  label: string | null;
  items: Match[];
}
interface CompetitionGroup {
  key: string;
  name: string;
  rounds: RoundGroup[];
}

/** Raggruppa per competizione e, all'interno, per "Girone X · Nª giornata", mantenendo l'ordine di apparizione. */
function groupByCompetition(matches: Match[]): CompetitionGroup[] {
  const comps: CompetitionGroup[] = [];
  for (const m of matches) {
    const compKey = m.competition?.id ?? "amichevoli";
    let c = comps.find((x) => x.key === compKey);
    if (!c) {
      c = { key: compKey, name: m.competition?.name ?? "Amichevoli", rounds: [] };
      comps.push(c);
    }
    const roundKey = `${m.group_name ?? ""}-${m.matchday ?? ""}`;
    let r = c.rounds.find((x) => x.key === roundKey);
    if (!r) {
      const label = [groupLabel(m.group_name), matchdayLabel(m.matchday)].filter(Boolean).join(" · ") || null;
      r = { key: roundKey, label, items: [] };
      c.rounds.push(r);
    }
    r.items.push(m);
  }
  return comps;
}

function MatchRow({ m }: { m: Match }) {
  const isLive = m.status === "live";
  const isFinished = m.status === "finished";
  const opponent = getOpponent(m);
  const ours = m.is_home ? m.home_score : m.away_score;
  const theirs = m.is_home ? m.away_score : m.home_score;
  const outcome = isFinished ? getOutcome(ours, theirs) : null;
  const d = new Date(m.match_date);
  const reels = m.instagram_reels?.length ?? 0;

  const scoreColor =
    outcome === "win" ? "text-win" : outcome === "loss" ? "text-loss" : outcome === "draw" ? "text-draw" : "text-text";

  return (
    <li>
      <Link
        href={`/calendario/${m.id}`}
        className={`bento-card flex items-center gap-3 p-3 sm:p-4 hover:bg-surface-2/60 transition ${
          isLive ? "ring-1 ring-accent/50" : ""
        } ${outcome ? `border-l-4 ${outcome === "win" ? "border-l-win" : outcome === "loss" ? "border-l-loss" : "border-l-draw"}` : ""}`}
      >
        {/* Data */}
        <div className="flex flex-col items-center w-12 shrink-0 rounded-xl bg-surface-2 border border-border py-1.5">
          <span className="text-[10px] uppercase text-muted leading-none">{formatWeekday(m.match_date)}</span>
          <span className="font-display text-lg font-bold leading-tight tabular">{d.getDate()}</span>
          <span className="text-[10px] text-muted leading-none">{formatDateShort(m.match_date).split(" ")[1]}</span>
        </div>

        {/* Squadre */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <VCHLogo size={24} />
            <span className="text-sm font-semibold truncate">Victoria Casa Hirta</span>
            {m.is_home && <Pill tone="brand" className="!py-px hidden xs:inline-flex">Casa</Pill>}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <TeamLogo src={m.opponent_logo_url} name={opponent} size={24} />
            <span className="text-sm font-semibold truncate">{opponent}</span>
            {!m.is_home && <Pill tone="neutral" className="!py-px hidden xs:inline-flex">Casa</Pill>}
          </div>
        </div>

        {/* Punteggio / orario */}
        <div className="flex flex-col items-end gap-1 shrink-0 min-w-[64px]">
          {isLive ? (
            <>
              <span className="font-display text-2xl font-bold tabular leading-none text-accent-soft">
                {ours ?? 0}<span className="text-muted mx-1">–</span>{theirs ?? 0}
              </span>
              <LiveBadge />
            </>
          ) : isFinished ? (
            <>
              <span className={`font-display text-2xl font-bold tabular leading-none ${scoreColor}`}>
                {ours ?? "–"}<span className="text-muted mx-1">–</span>{theirs ?? "–"}
              </span>
              <span className="flex items-center gap-1.5">
                {reels > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted" title={`${reels} reel`}>
                    <Clapperboard className="w-3 h-3" aria-hidden />
                    {reels}
                  </span>
                )}
                {outcome && (
                  <span className={`text-[11px] font-bold ${scoreColor}`}>{outcomeShort[outcome]}</span>
                )}
              </span>
            </>
          ) : (
            <>
              <span className="font-display text-lg font-bold tabular leading-none">{formatTime(m.match_date)}</span>
              <span className="text-[11px] text-muted truncate max-w-[110px]">{m.venue?.name ?? ""}</span>
            </>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted shrink-0 hidden sm:block" aria-hidden />
      </Link>
    </li>
  );
}

function MatchList({ matches, emptyTitle, emptyDesc }: { matches: Match[]; emptyTitle: string; emptyDesc: string }) {
  if (matches.length === 0) {
    return (
      <div className="bento-card">
        <EmptyState icon={CalendarX} title={emptyTitle} description={emptyDesc} />
      </div>
    );
  }
  const comps = groupByCompetition(matches);
  return (
    <div className="flex flex-col gap-8">
      {comps.map((c) => (
        <section key={c.key} aria-label={c.name}>
          <h2 className="font-display text-h3 mb-3 px-1">{c.name}</h2>
          <div className="flex flex-col gap-5">
            {c.rounds.map((r) => (
              <div key={r.key}>
                {r.label && (
                  <h3 className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2 px-1">{r.label}</h3>
                )}
                <ul className="flex flex-col gap-2">
                  {r.items.map((m) => (
                    <MatchRow key={m.id} m={m} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function CalendarioPage() {
  const matches = await getMatches();
  const played = matches.filter((m) => m.status === "finished");
  const upcoming = matches.filter((m) => m.status !== "finished");
  const hasLive = upcoming.some((m) => m.status === "live");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Partite" subtitle="Calendario e risultati della stagione">
        {hasLive && <LiveBadge className="mb-1" />}
      </PageHeader>

      <Tabs
        variant="segmented"
        defaultKey={upcoming.length > 0 ? "prossime" : "risultati"}
        items={[
          {
            key: "prossime",
            label: "Prossime",
            count: upcoming.length,
            content: (
              <MatchList
                matches={upcoming}
                emptyTitle="Nessuna partita in programma"
                emptyDesc="Il calendario verrà aggiornato a breve."
              />
            ),
          },
          {
            key: "risultati",
            label: "Risultati",
            count: played.length,
            content: (
              <MatchList
                matches={[...played].reverse()}
                emptyTitle="Nessun risultato"
                emptyDesc="I risultati compariranno dopo le prime partite."
              />
            ),
          },
        ]}
      />
    </div>
  );
}
