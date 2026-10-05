import Link from "next/link";
import { ArrowRight, ChevronRight, Medal } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Badge";
import CompetitionSnapshot from "@/components/competition/CompetitionSnapshot";
import { formatLabel, statusLabel } from "@/lib/competitions";
import {
  CompetitionRow,
  byStatus,
  competitionHref,
  getCompetitions,
  getFixtures,
  getStandings,
  getTeamLogos,
  statusTone,
  typeLabel,
} from "@/lib/competition-data";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Competizioni e classifiche",
  description: "Classifiche, gironi e tabelloni dei campionati e delle coppe della Victoria Casa Hirta, con tutti i risultati della stagione.",
  path: "/competizioni",
});

export default async function CompetizioniPage() {
  const [all, standings, fixtures, logos] = await Promise.all([getCompetitions(), getStandings(), getFixtures(), getTeamLogos()]);

  // Stagione corrente in evidenza; le altre stagioni sotto, raggruppate.
  const current = all.filter((c) => c.season?.is_current);
  const competitions = (current.length > 0 ? current : all).sort(byStatus);
  const seasonName = competitions.find((c) => c.season?.is_current)?.season?.name;

  const past = current.length > 0 ? all.filter((c) => !c.season?.is_current) : [];
  const pastSeasons: { name: string; items: CompetitionRow[] }[] = [];
  for (const c of past.sort(byStatus)) {
    const name = c.season?.name ?? "Senza stagione";
    let s = pastSeasons.find((x) => x.name === name);
    if (!s) {
      s = { name, items: [] };
      pastSeasons.push(s);
    }
    s.items.push(c);
  }
  pastSeasons.sort((a, b) => b.name.localeCompare(a.name));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
      <PageHeader
        title="Competizioni"
        subtitle={seasonName ? `Stagione ${seasonName} · classifiche, tabelloni e partite` : "Classifiche, tabelloni e partite"}
      />

      {competitions.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={Medal} title="Nessuna competizione" description="Le competizioni verranno caricate a breve." />
        </div>
      )}

      <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {competitions.map((c) => {
          const rows = standings.filter((s) => s.competition_id === c.id);
          const compFixtures = fixtures.filter((f) => f.competition_id === c.id);
          const upcoming = c.status === "in_arrivo" && rows.length === 0 && compFixtures.length === 0;
          return (
            <Link
              key={c.id}
              href={competitionHref(c)}
              className="bento-card tap p-5 flex flex-col gap-4 hover:bg-surface-2/40 transition group"
            >
              <div className="flex gap-4 items-start">
                <Avatar src={c.logo_url} name={c.name} size={56} rounded="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-h3 leading-tight text-balance">{c.name}</h2>
                    {c.status && statusLabel[c.status] && (
                      <Pill tone={statusTone(c.status)} className="shrink-0">{statusLabel[c.status]}</Pill>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1.5">
                    {[c.type && (typeLabel[c.type] ?? c.type), c.format && (formatLabel[c.format] ?? c.format), c.organizer].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              <div className="flex-1">
                {upcoming ? (
                  <p className="text-sm text-muted">Calendario e classifica saranno disponibili all&apos;inizio della competizione.</p>
                ) : (
                  <CompetitionSnapshot rows={rows} fixtures={compFixtures} logos={logos} />
                )}
              </div>

              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-soft group-hover:text-text transition border-t border-border pt-3">
                Classifica, tabellone e partite <ArrowRight className="w-4 h-4" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>

      {pastSeasons.length > 0 && (
        <section className="mt-12" aria-labelledby="past-seasons">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 id="past-seasons" className="font-display text-h2">Stagioni precedenti</h2>
              <p className="text-muted text-sm mt-1">Classifiche finali e risultati.</p>
            </div>
            <Link
              href="/storico"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-soft hover:text-text transition shrink-0"
            >
              Storico <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          {pastSeasons.map((s) => (
            <div key={s.name} className="mb-6">
              <h3 className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2 px-1">Stagione {s.name}</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {s.items.map((c) => (
                  <li key={c.id}>
                    <Link href={competitionHref(c)} className="bento-card tap p-4 flex items-center gap-3 hover:bg-surface-2/60">
                      <Avatar src={c.logo_url} name={c.name} size={40} rounded="xl" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        <p className="text-[11px] text-muted truncate">
                          {[c.type && (typeLabel[c.type] ?? c.type), c.format && (formatLabel[c.format] ?? c.format)].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {c.status && statusLabel[c.status] && <Pill tone={statusTone(c.status)}>{statusLabel[c.status]}</Pill>}
                      <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
