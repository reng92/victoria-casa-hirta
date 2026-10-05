import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import CompetitionSnapshot from "@/components/competition/CompetitionSnapshot";
import { isVCH } from "@/lib/competitions";
import { byStatus, competitionHref, getCompetitions, getFixtures, getStandings, getTeamLogos } from "@/lib/competition-data";

/**
 * Le competizioni in corso della Victoria, ognuna col suo riepilogo:
 * classifica del girone o sfida del tabellone.
 */
export default async function HomeCompetitions() {
  const [all, standings, fixtures, logos] = await Promise.all([getCompetitions(), getStandings(), getFixtures(), getTeamLogos()]);
  const plays = (id: string) =>
    standings.some((s) => s.competition_id === id && isVCH(s.team_name)) ||
    fixtures.some((f) => f.competition_id === id && (isVCH(f.home_team) || isVCH(f.away_team)));
  const active = all.filter((c) => c.status === "attiva" && plays(c.id)).sort(byStatus);

  return (
    <div className="bento-card p-5 h-full flex flex-col">
      <SectionHeader title="Competizioni" eyebrow="In corso" icon={Trophy} href="/competizioni" hrefLabel="Tutte" />
      {active.length === 0 ? (
        <EmptyState compact title="Nessuna competizione in corso" description="Classifiche e tabelloni compariranno qui." />
      ) : (
        <div className={`mt-4 grid gap-5 flex-1 ${active.length > 1 ? "xl:grid-cols-2" : ""}`}>
          {active.map((c) => (
            <section key={c.id} aria-label={c.name} className="min-w-0 flex flex-col gap-3">
              <Link href={competitionHref(c)} className="flex items-center gap-2.5 group min-w-0">
                <Avatar src={c.logo_url} name={c.name} size={32} rounded="xl" />
                <span className="font-semibold text-sm truncate flex-1 group-hover:text-accent-soft transition">{c.name}</span>
                <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden />
              </Link>
              <CompetitionSnapshot
                rows={standings.filter((s) => s.competition_id === c.id)}
                fixtures={fixtures.filter((f) => f.competition_id === c.id)}
                logos={logos}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
