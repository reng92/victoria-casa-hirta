import { supabase } from "@/lib/supabase";
import { Trophy } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Tabs from "@/components/ui/Tabs";
import Bracket, { buildPlaceholderRounds } from "@/components/Bracket";
import { Pill } from "@/components/ui/Badge";
import {
  QUALIFIED_PER_GROUP,
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
  const standings = await getStandings();

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
          </section>
        );
      })}
    </div>
  );
}
