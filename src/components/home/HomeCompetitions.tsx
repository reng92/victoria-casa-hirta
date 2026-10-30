import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import CompetitionSnapshot from "@/components/competition/CompetitionSnapshot";
import { isVCH } from "@/lib/competitions";
import { byStatus, competitionHref, type CompetitionRow, getCompetitions, getFixtures, getStandings, getTeamLogos } from "@/lib/competition-data";

/** Il campionato prima delle coppe. */
const campionatoFirst = (a: CompetitionRow, b: CompetitionRow) =>
  Number(b.type === "campionato") - Number(a.type === "campionato") || byStatus(a, b);

/**
 * Le competizioni in corso del Victoria, ognuna col suo riepilogo:
 * classifica del girone o sfida del tabellone. Il campionato viene per primo
 * e su desktop prende più spazio.
 */
export default async function HomeCompetitions() {
  const [all, standings, fixtures, logos] = await Promise.all([getCompetitions(), getStandings(), getFixtures(), getTeamLogos()]);
  const plays = (id: string) =>
    standings.some((s) => s.competition_id === id && isVCH(s.team_name)) ||
    fixtures.some((f) => f.competition_id === id && (isVCH(f.home_team) || isVCH(f.away_team)));
  const active = all.filter((c) => c.status === "attiva" && plays(c.id)).sort(campionatoFirst);
  const lead = active[0]?.type === "campionato" && active.length > 1;

  return (
    <div className="bento-card p-5 h-full flex flex-col">
      <SectionHeader title="Competizioni" eyebrow="In corso" icon={Trophy} href="/competizioni" hrefLabel="Tutte" />
      {active.length === 0 ? (
        <EmptyState compact title="Nessuna competizione in corso" description="Classifiche e tabelloni compariranno qui." />
      ) : (
        <div className={`mt-4 grid gap-5 flex-1 ${lead ? "xl:grid-cols-5" : active.length > 1 ? "xl:grid-cols-2" : ""}`}>
          {active.map((c, i) => (
            <section
              key={c.id}
              aria-label={c.name}
              className={`min-w-0 flex flex-col gap-3 ${lead ? (i === 0 ? "xl:col-span-3" : "xl:col-span-2") : ""}`}
            >
              <Link href={competitionHref(c)} className="flex items-center gap-2.5 group min-w-0">
                <Avatar src={c.logo_url} name={c.name} size={32} rounded="xl" />
                <span className="font-semibold text-sm truncate flex-1 group-hover:text-accent-soft transition">{c.name}</span>
                <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden />
              </Link>
              <CompetitionSnapshot
                rows={standings.filter((s) => s.competition_id === c.id)}
                fixtures={fixtures.filter((f) => f.competition_id === c.id)}
                logos={logos}
                limit={lead && i === 0 ? 6 : 4}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
