import Tabs from "@/components/ui/Tabs";
import TeamLogo from "@/components/ui/TeamLogo";
import Bracket, { buildBracketRounds, buildPlaceholderRounds } from "@/components/Bracket";
import {
  Fixture,
  QUALIFIED_PER_GROUP,
  groupLabel,
  matchdayLabel,
  groupByGroupName,
  isGroupFormat,
  isVCH,
  teamKey,
} from "@/lib/competitions";
import { isPlaceholderName } from "@/lib/schedule";
import type { CompetitionRow, Standing, TeamLogos } from "@/lib/competition-data";

/* ------------------------------------------------------------------ */
/* Risultati per giornata                                              */
/* ------------------------------------------------------------------ */

function formatDay(iso: string | null) {
  if (!iso) return null;
  const [y, mo, d] = iso.slice(0, 10).split("-");
  return `${d}/${mo}/${y.slice(2)}`;
}

function FixtureLine({ f, logos }: { f: Fixture; logos: TeamLogos }) {
  const played = f.home_score != null && f.away_score != null && f.status !== "scheduled";
  const team = (name: string, align: string) => (
    <span className={`min-w-0 flex items-center gap-1.5 ${align === "text-right" ? "justify-end" : "flex-row-reverse justify-end"}`}>
      <span className={`truncate ${align} ${isVCH(name) ? "font-semibold text-text" : "text-text/85"}`}>{name}</span>
      <TeamLogo src={logos[teamKey(name)]} name={name} size={20} className="hidden xs:inline-flex" />
    </span>
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

function ResultsByMatchday({ fixtures, logos, showGroup = true }: { fixtures: Fixture[]; logos: TeamLogos; showGroup?: boolean }) {
  const days: { label: string; date: string | null; rows: Fixture[] }[] = [];
  for (const f of fixtures) {
    const label = [f.round || matchdayLabel(f.matchday) || "Altre partite", showGroup ? groupLabel(f.group_name) : null].filter(Boolean).join(" · ");
    let d = days.find((x) => x.label === label);
    if (!d) {
      d = { label, date: f.match_date, rows: [] };
      days.push(d);
    }
    d.rows.push(f);
  }
  // Apre l'ultima giornata con almeno un risultato, altrimenti la prima da giocare
  let openIdx = 0;
  days.forEach((d, i) => {
    if (d.rows.some((f) => f.status === "finished")) openIdx = i;
  });
  if (days.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2 px-1">Partite e risultati</h3>
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
                <FixtureLine key={`${f.source}:${f.id}`} f={f} logos={logos} />
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
  qualified = QUALIFIED_PER_GROUP,
  logos,
}: {
  logos: TeamLogos;
  rows: Standing[];
  mode: "zones" | "groups";
  caption: string;
  qualified?: number;
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
                ? pos <= qualified
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
                <td className="py-3 px-2 max-w-[140px] sm:max-w-[240px]">
                  <span className="flex items-center gap-2 min-w-0">
                    <TeamLogo src={logos[teamKey(row.team_name)]} name={row.team_name} size={22} className="hidden xs:inline-flex" />
                    <span className="truncate">{row.team_name}</span>
                  </span>
                </td>
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

function GroupStage({
  compName,
  rows,
  fixtures,
  qualifiedPerGroup,
  logos,
}: {
  compName: string;
  rows: Standing[];
  fixtures: Fixture[];
  qualifiedPerGroup: number;
  logos: TeamLogos;
}) {
  const groups = groupByGroupName(rows);
  const knockout = fixtures.filter((f) => f.round);
  const waitingGroups = knockout.some(
    (f) =>
      (f.home_source?.startsWith("G:") && isPlaceholderName(f.home_team, f.home_source)) ||
      (f.away_source?.startsWith("G:") && isPlaceholderName(f.away_team, f.away_source)),
  );

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
              <StandingsTable rows={g.rows} mode="groups" caption={`${compName} · ${g.label}`} qualified={qualifiedPerGroup} logos={logos} />
              <GroupLegend />
              <ResultsByMatchday fixtures={fixtures.filter((f) => !f.round && (f.group_name ?? "") === g.key)} showGroup={false} logos={logos} />
            </>
          ),
        }))}
      />
      <div className="mt-6">
        {knockout.length > 0 ? (
          <Bracket rounds={buildBracketRounds(knockout)} logos={logos} note={waitingGroups ? "Le qualificate compaiono a fine gironi" : undefined} />
        ) : (
          <Bracket rounds={buildPlaceholderRounds(groups.length * qualifiedPerGroup)} note="In attesa della fine dei gironi" />
        )}
      </div>
    </>
  );
}

/**
 * Classifica, partite e tabellone di una competizione, secondo la formula:
 * girone unico, gironi + fase finale o sola eliminazione diretta.
 */
export default function CompetitionView({
  competition: c,
  rows,
  fixtures,
  logos,
}: {
  competition: Pick<CompetitionRow, "name" | "format" | "qualified_per_group">;
  rows: Standing[];
  fixtures: Fixture[];
  logos: TeamLogos;
}) {
  const knockoutOnly = c.format === "eliminazione_diretta";
  const hasGroups = !knockoutOnly && (isGroupFormat(c.format) || rows.some((r) => !!r.group_name));
  const knockout = fixtures.filter((f) => f.round);

  if (hasGroups) {
    return (
      <GroupStage
        compName={c.name}
        rows={rows}
        fixtures={fixtures}
        qualifiedPerGroup={c.qualified_per_group ?? QUALIFIED_PER_GROUP}
        logos={logos}
      />
    );
  }
  if (knockoutOnly) {
    return knockout.length > 0 ? (
      <Bracket rounds={buildBracketRounds(knockout)} logos={logos} />
    ) : (
      <p className="text-sm text-muted px-1">Il tabellone sarà pubblicato dopo il sorteggio.</p>
    );
  }
  return (
    <>
      {rows.length > 0 && <StandingsTable rows={rows} mode="zones" caption={c.name} logos={logos} />}
      {rows.length >= 6 && <ZoneLegend />}
      <ResultsByMatchday fixtures={fixtures.filter((f) => !f.round)} logos={logos} />
      {knockout.length > 0 && (
        <div className="mt-6">
          <Bracket rounds={buildBracketRounds(knockout)} logos={logos} />
        </div>
      )}
    </>
  );
}
