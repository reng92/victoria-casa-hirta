import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Badge";
import CompetitionView from "@/components/competition/CompetitionView";
import { formatLabel, statusLabel } from "@/lib/competitions";
import {
  competitionHref,
  competitionSlug,
  getCompetitions,
  getFixtures,
  getStandings,
  getTeamLogos,
  levelLabel,
  statusTone,
  typeLabel,
} from "@/lib/competition-data";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

async function getCompetition(slug: string) {
  const all = await getCompetitions();
  return all.find((c) => competitionSlug(c.name) === slug || c.id === slug) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await getCompetition(params.slug);
  if (!c) return { title: "Competizione non trovata", robots: { index: false } };
  const kind = c.format === "eliminazione_diretta" ? "tabellone, accoppiamenti" : "classifica, calendario";
  return pageMetadata({
    title: c.season ? `${c.name} ${c.season.name}` : c.name,
    description: `${c.name}${c.season ? ` ${c.season.name}` : ""}: ${kind} e risultati della Victoria Casa Hirta${c.organizer ? `, organizzata da ${c.organizer}` : ""}.`,
    path: competitionHref(c),
  });
}

export default async function CompetitionPage({ params }: { params: { slug: string } }) {
  const c = await getCompetition(params.slug);
  if (!c) notFound();

  const [rows, fixtures, logos] = await Promise.all([getStandings(c.id), getFixtures(c.id), getTeamLogos()]);
  const meta = [
    c.type && (typeLabel[c.type] ?? c.type),
    c.level && (levelLabel[c.level] ?? c.level),
    c.format && (formatLabel[c.format] ?? c.format),
    c.season && `Stagione ${c.season.name}`,
  ].filter(Boolean);
  const empty = rows.length === 0 && fixtures.length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <Link href="/competizioni" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text transition mb-4">
        <ChevronLeft className="w-4 h-4" aria-hidden /> Competizioni
      </Link>

      <header className="flex items-start gap-4 mb-6">
        <Avatar src={c.logo_url} name={c.name} size={64} rounded="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-h2 leading-tight">{c.name}</h1>
            {c.status && statusLabel[c.status] && <Pill tone={statusTone(c.status)}>{statusLabel[c.status]}</Pill>}
          </div>
          <p className="text-sm text-muted mt-1">{meta.join(" · ")}</p>
          {c.organizer && <p className="text-xs text-muted mt-0.5">Organizzatore: <span className="text-text">{c.organizer}</span></p>}
          {c.notes && <p className="mt-2 text-sm text-text/90">{c.notes}</p>}
        </div>
      </header>

      {empty ? (
        <div className="bento-card p-6 text-sm text-muted">Calendario e classifica saranno disponibili all&apos;inizio della competizione.</div>
      ) : (
        <CompetitionView competition={c} rows={rows} fixtures={fixtures} logos={logos} />
      )}
    </div>
  );
}
