import TeamLogo from "@/components/ui/TeamLogo";
import { Fixture, fixtureWinner, groupLabel, isVCH, roundOrder, teamKey } from "@/lib/competitions";
import { isPlaceholderName } from "@/lib/schedule";
import type { Standing, TeamLogos } from "@/lib/competition-data";

function formatDay(iso: string | null) {
  if (!iso) return null;
  const [, mo, d] = iso.slice(0, 10).split("-");
  const time = iso.slice(11, 16);
  return `${d}/${mo}${time && time !== "00:00" ? ` · ${time}` : ""}`;
}

/** Ultima partita della Victoria nella fase a eliminazione diretta (turno più avanzato). */
function currentTie(fixtures: Fixture[]) {
  return fixtures
    .filter((f) => f.round && (isVCH(f.home_team) || isVCH(f.away_team)))
    .filter((f) => !isPlaceholderName(f.home_team, f.home_source) || !isPlaceholderName(f.away_team, f.away_source))
    .sort((a, b) => roundOrder(b.round!) - roundOrder(a.round!))[0];
}

/**
 * Riepilogo della Victoria in una competizione: la sfida del tabellone se è
 * nella fase a eliminazione diretta, altrimenti le prime del suo girone (o
 * della classifica) con la sua posizione.
 */
export default function CompetitionSnapshot({
  rows,
  fixtures,
  logos,
  limit = 4,
}: {
  rows: Standing[];
  fixtures: Fixture[];
  logos: TeamLogos;
  limit?: number;
}) {
  const tie = currentTie(fixtures);
  if (tie) return <TieSnapshot f={tie} logos={logos} />;

  const vch = rows.find((r) => isVCH(r.team_name));
  const group = vch?.group_name ?? null;
  const table = rows.filter((r) => (r.group_name ?? null) === group);
  if (table.length === 0) return <p className="text-sm text-muted">Calendario e classifica in arrivo.</p>;

  const top = table.slice(0, limit);
  const vchIndex = table.findIndex((r) => isVCH(r.team_name));
  return (
    <div>
      {group && <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">{groupLabel(group)}</p>}
      <ol className="flex flex-col gap-1.5">
        {top.map((r, i) => (
          <StandingRow key={r.id} r={r} pos={i + 1} logos={logos} />
        ))}
        {vch && vchIndex >= limit && (
          <>
            <li aria-hidden className="text-center text-muted text-xs leading-none py-0.5">···</li>
            <StandingRow r={vch} pos={vchIndex + 1} logos={logos} />
          </>
        )}
      </ol>
    </div>
  );
}

function StandingRow({ r, pos, logos }: { r: Standing; pos: number; logos: TeamLogos }) {
  const vch = isVCH(r.team_name);
  return (
    <li
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
        vch ? "bg-brand/40 border-l-2 border-accent font-semibold" : "bg-surface-2/50"
      }`}
    >
      <span className={`w-4 text-center tabular text-xs ${pos === 1 ? "text-draw font-bold" : "text-muted"}`}>{pos}</span>
      <TeamLogo src={logos[teamKey(r.team_name)]} name={r.team_name} size={22} />
      <span className="flex-1 truncate">{r.team_name}</span>
      <span className="text-muted text-xs tabular">{r.played} g</span>
      <span className="font-display font-bold tabular w-7 text-right">{r.points}</span>
    </li>
  );
}

function TieSnapshot({ f, logos }: { f: Fixture; logos: TeamLogos }) {
  const played = f.status !== "scheduled" && f.home_score != null && f.away_score != null;
  const winner = fixtureWinner(f);
  const vchSide = isVCH(f.home_team) ? "home" : "away";
  const outcome = !winner ? null : winner === vchSide ? "Qualificata al turno successivo" : `Eliminata ai ${f.round!.toLowerCase()}`;
  const penalties = f.home_penalties != null && f.away_penalties != null ? `d.c.r. ${f.home_penalties}-${f.away_penalties}` : null;

  const team = (name: string, score: number | null, side: "home" | "away") => (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 ${isVCH(name) ? "bg-brand/40 font-semibold" : ""} ${winner && winner !== side ? "opacity-60" : ""}`}>
      <TeamLogo src={logos[teamKey(name)]} name={name} size={28} />
      <span className="flex-1 truncate text-sm">{name}</span>
      {played && <span className="font-display font-bold tabular text-lg">{score}</span>}
    </div>
  );

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">{f.round}</p>
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/70 bg-surface-2/40">
        {team(f.home_team, f.home_score, "home")}
        {team(f.away_team, f.away_score, "away")}
      </div>
      <p className="text-xs text-muted mt-2">
        {outcome ?? (played ? null : formatDay(f.match_date) ?? "Data e orario da definire")}
        {penalties && ` · ${penalties}`}
      </p>
    </div>
  );
}
