import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowRight, CalendarDays, Medal, Trophy } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Badge";
import { formatLabel, statusLabel } from "@/lib/competitions";

export const revalidate = 60;

interface Competition {
  id: string;
  name: string;
  type: string | null;
  level: string | null;
  organizer: string | null;
  logo_url: string | null;
  format: string | null;
  status: string | null;
  notes: string | null;
  season: { name: string; is_current: boolean } | null;
}

async function getCompetitions(): Promise<Competition[]> {
  const { data } = await supabase
    .from("competitions")
    .select("*, season:seasons(name, is_current)")
    .order("name", { ascending: true });
  return (data as unknown as Competition[]) ?? [];
}

const levelLabel: Record<string, string> = {
  provinciale: "Provinciale",
  regionale: "Regionale",
  nazionale: "Nazionale",
};

const typeLabel: Record<string, string> = {
  campionato: "Campionato",
  coppa: "Coppa",
  torneo: "Torneo",
};

const statusOrder: Record<string, number> = { attiva: 0, in_arrivo: 1, conclusa: 2 };

const statusTone = (s: string | null) =>
  s === "attiva" ? "win" : s === "in_arrivo" ? "draw" : s === "conclusa" ? "neutral" : "neutral";

export default async function CompetizioniPage() {
  const all = await getCompetitions();

  // Stagione corrente in evidenza; le altre stagioni sotto, raggruppate.
  const byStatus = (a: Competition, b: Competition) =>
    (statusOrder[a.status ?? ""] ?? 1) - (statusOrder[b.status ?? ""] ?? 1) || a.name.localeCompare(b.name);
  const current = all.filter((c) => c.season?.is_current);
  const competitions = (current.length > 0 ? current : all).sort(byStatus);
  const seasonName = competitions.find((c) => c.season?.is_current)?.season?.name;

  const past = current.length > 0 ? all.filter((c) => !c.season?.is_current) : [];
  const pastSeasons: { name: string; items: Competition[] }[] = [];
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
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader
        title="Competizioni"
        subtitle={seasonName ? `Stagione ${seasonName} · campionati e coppe a cui partecipiamo` : "Campionati e coppe a cui partecipiamo"}
      />

      {competitions.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={Medal} title="Nessuna competizione" description="Le competizioni verranno caricate a breve." />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {competitions.map((c) => {
          const upcoming = c.status === "in_arrivo";
          return (
            <article key={c.id} className={`bento-card p-5 flex flex-col gap-4 ${upcoming ? "opacity-90" : ""}`}>
              <div className="flex gap-4 items-start">
                <Avatar src={c.logo_url} name={c.name} size={56} rounded="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-h3 leading-tight text-balance">{c.name}</h2>
                    {c.status && statusLabel[c.status] && (
                      <Pill tone={statusTone(c.status)} className="shrink-0">{statusLabel[c.status]}</Pill>
                    )}
                  </div>
                  {(c.type || c.level) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.type && <Pill tone="brand">{typeLabel[c.type] ?? c.type}</Pill>}
                      {c.level && <Pill tone="accent">{levelLabel[c.level] ?? c.level}</Pill>}
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-0.5 text-xs text-muted">
                    {c.format && <p>Formula: <span className="text-text">{formatLabel[c.format] ?? c.format}</span></p>}
                    {c.organizer && <p>Organizzatore: <span className="text-text">{c.organizer}</span></p>}
                    {c.season && <p>Stagione: <span className="text-text">{c.season.name}</span></p>}
                  </div>
                  {c.notes && <p className="mt-2 text-sm text-text/90">{c.notes}</p>}
                </div>
              </div>

              {upcoming ? (
                <p className="text-xs text-muted border-t border-border pt-3">
                  Calendario e classifica saranno disponibili all&apos;inizio della competizione.
                </p>
              ) : (
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <Link
                    href="/calendario"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-2 border border-border hover:bg-brand hover:text-white transition"
                  >
                    <CalendarDays className="w-3.5 h-3.5" aria-hidden /> Calendario
                  </Link>
                  <Link
                    href="/classifica"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-2 border border-border hover:bg-brand hover:text-white transition"
                  >
                    <Trophy className="w-3.5 h-3.5" aria-hidden /> Classifica
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {pastSeasons.length > 0 && (
        <section className="mt-12" aria-labelledby="past-seasons">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 id="past-seasons" className="font-display text-h2">Stagioni precedenti</h2>
              <p className="text-muted text-sm mt-1">Risultati, classifiche finali e piazzamenti nello storico.</p>
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
                    <Link href="/storico" className="bento-card p-4 flex items-center gap-3 hover:bg-surface-2/60 transition">
                      <Avatar src={c.logo_url} name={c.name} size={40} rounded="xl" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        <p className="text-[11px] text-muted truncate">
                          {[c.type && (typeLabel[c.type] ?? c.type), c.format && (formatLabel[c.format] ?? c.format)].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {c.status && statusLabel[c.status] && <Pill tone={statusTone(c.status)}>{statusLabel[c.status]}</Pill>}
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
