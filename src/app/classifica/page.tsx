import { supabase } from "@/lib/supabase";
import { Trophy } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Tabs from "@/components/ui/Tabs";
import Bracket, { buildPlaceholderRounds } from "@/components/Bracket";
import { Pill } from "@/components/ui/Badge";
import {
  Fixture,
  QUALIFIED_PER_GROUP,
  fixtureFromMatch,
  groupLabel,
  matchdayLabel,
  sortFixtures,
  groupByGroupName,
  isGroupFormat,
  isVCH,
  sortStandings,
  statusLabel,
} from "@/lib/competitions";

export const revalidate = 60;

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
  competition: { id: string; name: string; format: string | null; status: string | null } | null;
}

async function getStandings(): Promise<Standing[]> {
  const { data, error } = await supabase
    .from("standings")
    .select("*, competition:competitions(id, name, format, status)")
    .order("group_name", { ascending: true, nullsFirst: true })
    .order("points", { ascending: false });
  if (error) {
    // Fallback se la migrazione (group_name/format/status) non è ancora applicata
    const { data: fallback } = await supabase
      .from("standings")
      .select("*, competition:competitions(id, name)")
      .order("points", { ascending: false });
    return sortStandings((fallback as unknown as Standing[]) ?? []);
  }
  return sortStandings((data as unknown as Standing[]) ?? []);
}

type CompFixture = Fixture & { competition_id: string };

/** Tutte le partite delle competizioni: quelle tra altre squadre e quelle della Victoria. */
async function getFixtures(): Promise<CompFixture[]> {
  const [{ data: r }, { data: m }] = await Promise.all([
    supabase
      .from("competition_results")
      .select("id, competition_id, match_date, matchday, group_name, round, home_team, away_team, home_score, away_score, status"),
    supabase
      .from("matches")
      .select("id, competition_id, match_date, matchday, group_name, home_team, away_team, is_home, home_score, away_score, status")
      .not("competition_id", "is", null),
  ]);
  return sortFixtures([
    ...((r as Omit<CompFixture, "source">[]) ?? []).map((x) => ({ ...x, source: "result" as const })),
    ...((m as (Parameters<typeof fixtureFromMatch>[0] & { competition_id: string })[]) ?? []).map((x) => ({
      ...fixtureFromMatch(x),
      competition_id: x.competition_id,
    })),
  ]);
}

/* ------------------------------------------------------------------ */
/* Risultati per giornata                                              */
/* ------------------------------------------------------------------ */

function formatDay(iso: string | null) {
  if (!iso) return null;
  const [y, mo, d] = iso.slice(0, 10).split("-");
  return `${d}/${mo}/${y.slice(2)}`;
}

function FixtureLine({ f }: { f: Fixture }) {
  const played = f.home_score != null && f.away_score != null && f.status !== "scheduled";
  const team = (name: string, align: string) => (
    <span className={`truncate ${align} ${isVCH(name) ? "font-semibold text-text" : "text-text/85"}`}>{name}</span>
  );
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 py-2.5 border-t border-border first:border-t-0 text-xs sm:text-sm">
      {team(f.home_team, "text-right")}
      <span className="tabular font-display font-bold text-center min-w-[52px]">
        {played ? (
          <>
            {f.home_score}
            <span className="text-muted mx-1">–</span>
            {f.away_score}
          </>
        ) : (
          <span className="text-muted font-normal text-[11px]">{formatDay(f.match_date) ?? "vs"}</span>
        )}
      </span>
      {team(f.away_team, "text-left")}
    </li>
  );
}

function ResultsByMatchday({ fixtures }: { fixtures: Fixture[] }) {
  const days: { label: string; date: string | null; rows: Fixture[] }[] = [];
  for (const f of fixtures) {
    const label = [f.round || matchdayLabel(f.matchday) || "Altre partite", groupLabel(f.group_name)].filter(Boolean).join(" · ");
    let d = days.find((x) => x.label === label);
    if (!d) {
      d = { label, date: f.match_date, rows: [] };
      days.push(d);
    }
    d.rows.push(f);
  }
  // Apre l'ultima giornata con almeno un risultato
  let openIdx = -1;
  days.forEach((d, i) => {
    if (d.rows.some((f) => f.status === "finished")) openIdx = i;
  });

  return (
    <div className="mt-6">
      <h3 className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2 px-1">Risultati</h3>
      <div className="rounded-card border border-border bg-surface shadow-card divide-y divide-border">
        {days.map((d, i) => (
          <details key={d.label} open={i === openIdx} className="group px-3 sm:px-4">
            <summary className="flex items-center justify-between gap-3 py-3 cursor-pointer list-none text-sm font-semibold">
              <span>{d.label}</span>
              <span className="flex items-center gap-2 text-[11px] text-muted font-normal">
                {formatDay(d.date)}
                <span className="transition group-open:rotate-180" aria-hidden>▾</span>
              </span>
            </summary>
            <ul className="pb-2">
              {d.rows.map((f) => (
                <FixtureLine key={`${f.source}:${f.id}`} f={f} />
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Zone (girone unico)                                                 */
/* ------------------------------------------------------------------ */

type Zone = "promo" | "playoff" | "playout" | "releg" | null;

/** Zone di classifica (indicative): 1ª promozione, 2ª-4ª playoff, ultime 2 retrocessione, terzultima playout. */
function getZone(pos: number, total: number): Zone {
  if (total < 6) return pos === 1 ? "promo" : null;
  if (pos === 1) return "promo";
  if (pos <= 4) return "playoff";
  if (pos > total - 2) return "releg";
  if (pos === total - 2) return "playout";
  return null;
}

const zoneStyle: Record<Exclude<Zone, null>, { bar: string; label: string }> = {
  promo: { bar: "bg-win", label: "Promozione" },
  playoff: { bar: "bg-brand-soft", label: "Playoff" },
  playout: { bar: "bg-draw", label: "Playout" },
  releg: { bar: "bg-loss", label: "Retrocessione" },
};

/* ------------------------------------------------------------------ */
/* Tabella                                                             */
/* ------------------------------------------------------------------ */

function StandingsTable({
  rows,
  mode,
  caption,
}: {
  rows: Standing[];
  mode: "zones" | "groups";
  caption: string;
}) {
  const total = rows.length;
  return (
    <div className="rounded-card border border-border bg-surface shadow-card">
      <table className="w-full text-xs sm:text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-16 z-10">
          <tr className="bg-surface-2 text-muted text-[11px] uppercase tracking-wider">
            <th scope="col" className="py-2.5 pl-3 sm:pl-4 pr-1 text-left w-10 rounded-tl-card">#</th>
            <th scope="col" className="py-2.5 px-2 text-left">Squadra</th>
            <th scope="col" className="py-2.5 px-2 text-center">G</th>
            <th scope="col" className="py-2.5 px-2 text-center">V</th>
            <th scope="col" className="py-2.5 px-2 text-center">N</th>
            <th scope="col" className="py-2.5 px-2 text-center">P</th>
            <th scope="col" className="py-2.5 px-2 text-center hidden sm:table-cell">GF</th>
            <th scope="col" className="py-2.5 px-2 text-center hidden sm:table-cell">GS</th>
            <th scope="col" className="py-2.5 px-2 text-center">DR</th>
            <th scope="col" className="py-2.5 pl-2 pr-3 sm:pr-4 text-right font-bold text-text rounded-tr-card">Pt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pos = i + 1;
            const vch = isVCH(row.team_name);
            const dr = row.goals_for - row.goals_against;
            const bar =
              mode === "groups"
                ? pos <= QUALIFIED_PER_GROUP
                  ? "bg-win"
                  : "bg-transparent"
                : (() => {
                    const z = getZone(pos, total);
                    return z ? zoneStyle[z].bar : "bg-transparent";
                  })();
            return (
              <tr
                key={row.id}
                className={`border-t border-border transition ${
                  vch ? "bg-brand/35 font-semibold shadow-[inset_3px_0_0_0_rgb(var(--accent-rgb))]" : "hover:bg-surface-2/50"
                }`}
              >
                <td className="py-3 pl-3 sm:pl-4 pr-1">
                  <span className="inline-flex items-center gap-2">
                    <span className={`w-1 h-5 rounded-full ${bar}`} aria-hidden />
                    <span className="tabular text-muted">{pos}</span>
                  </span>
                </td>
                <td className="py-3 px-2 max-w-[120px] sm:max-w-[220px]"><span className="block truncate">{row.team_name}</span></td>
                <td className="py-3 px-2 text-center tabular">{row.played}</td>
                <td className="py-3 px-2 text-center tabular text-win">{row.won}</td>
                <td className="py-3 px-2 text-center tabular text-draw">{row.drawn}</td>
                <td className="py-3 px-2 text-center tabular text-loss">{row.lost}</td>
                <td className="py-3 px-2 text-center tabular hidden sm:table-cell">{row.goals_for}</td>
                <td className="py-3 px-2 text-center tabular hidden sm:table-cell">{row.goals_against}</td>
                <td className="py-3 px-2 text-center tabular text-muted">{dr > 0 ? `+${dr}` : dr}</td>
                <td className="py-3 pl-2 pr-3 sm:pr-4 text-right font-display font-bold text-sm sm:text-base tabular">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ZoneLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-1 text-[11px] text-muted" aria-label="Legenda zone">
      {(Object.keys(zoneStyle) as Exclude<Zone, null>[]).map((z) => (
        <li key={z} className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${zoneStyle[z].bar}`} aria-hidden />
          {zoneStyle[z].label}
        </li>
      ))}
    </ul>
  );
}

function GroupLegend() {
  return (
    <p className="inline-flex items-center gap-1.5 mt-3 px-1 text-[11px] text-muted" aria-label="Legenda">
      <span className="w-2 h-2 rounded-full bg-win" aria-hidden />
      Qualificate alla fase a eliminazione diretta
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Sezione competizione                                                */
/* ------------------------------------------------------------------ */

function GroupStage({ compName, rows }: { compName: string; rows: Standing[] }) {
  const groups = groupByGroupName(rows);
  const qualified = groups.length * QUALIFIED_PER_GROUP;

  return (
    <>
      <Tabs
        variant="segmented"
        items={groups.map((g) => ({
          key: g.key || "unico",
          label: g.label,
          count: g.rows.length,
          content: (
            <>
              <StandingsTable rows={g.rows} mode="groups" caption={`${compName} · ${g.label}`} />
              <GroupLegend />
            </>
          ),
        }))}
      />
      <div className="mt-6">
        <Bracket rounds={buildPlaceholderRounds(qualified)} note="In attesa della fine dei gironi" />
      </div>
    </>
  );
}

export default async function ClassificaPage() {
  const [standings, fixtures] = await Promise.all([getStandings(), getFixtures()]);

  // Raggruppa per competizione mantenendo l'ordine di apparizione
  const comps: { key: string; name: string; format: string | null; status: string | null; rows: Standing[] }[] = [];
  for (const s of standings) {
    const key = s.competition?.id ?? s.competition?.name ?? "generale";
    let c = comps.find((x) => x.key === key);
    if (!c) {
      c = {
        key,
        name: s.competition?.name ?? "Generale",
        format: s.competition?.format ?? null,
        status: s.competition?.status ?? null,
        rows: [],
      };
      comps.push(c);
    }
    c.rows.push(s);
  }
  // Competizioni in corso per prime, poi in arrivo, infine concluse
  const statusOrder: Record<string, number> = { attiva: 0, in_arrivo: 1, conclusa: 2 };
  comps.sort((a, b) => (statusOrder[a.status ?? ""] ?? 1) - (statusOrder[b.status ?? ""] ?? 1));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Classifica" subtitle="Classifiche per competizione" />

      {standings.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={Trophy} title="Classifica non disponibile" description="Verrà caricata dopo le prime giornate." />
        </div>
      )}

      {comps.map((c) => {
        const hasGroups = isGroupFormat(c.format) || c.rows.some((r) => !!r.group_name);
        const headingId = `comp-${c.key}`;
        return (
          <section key={c.key} className="mb-12" aria-labelledby={headingId}>
            <div className="flex items-center gap-2 flex-wrap mb-3 px-1">
              <h2 id={headingId} className="font-display text-h3">{c.name}</h2>
              {c.status && statusLabel[c.status] && (
                <Pill tone={c.status === "attiva" ? "win" : c.status === "in_arrivo" ? "neutral" : "neutral"}>
                  {statusLabel[c.status]}
                </Pill>
              )}
            </div>

            {hasGroups ? (
              <GroupStage compName={c.name} rows={c.rows} />
            ) : (
              <>
                <StandingsTable rows={c.rows} mode="zones" caption={c.name} />
                {c.rows.length >= 6 && <ZoneLegend />}
              </>
            )}

            {(() => {
              const compFixtures = fixtures.filter((f) => f.competition_id === c.key);
              return compFixtures.length > 0 ? <ResultsByMatchday fixtures={compFixtures} /> : null;
            })()}
          </section>
        );
      })}
    </div>
  );
}
