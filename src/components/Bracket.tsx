import { Trophy } from "lucide-react";
import TeamLogo from "@/components/ui/TeamLogo";
import { Fixture, fixtureWinner, isVCH, roundOrder, teamKey } from "@/lib/competitions";
import { isPlaceholderName } from "@/lib/schedule";

interface Slot {
  name?: string | null;
  score?: number | null;
  penalties?: number | null;
  winner?: boolean;
  /** Squadra non ancora definita ("1ª Girone A", "Vincente Semifinale 1"). */
  pending?: boolean;
}
interface Tie {
  home?: Slot;
  away?: Slot;
  date?: string | null;
}
export interface BracketRound {
  label: string;
  ties: Tie[];
}

/**
 * Tabellone della fase finale. Con `rounds` vuoti genera un placeholder
 * dimensionato sul numero di qualificate (4 → semifinali + finale,
 * 8 → quarti + semifinali + finale).
 */
export function buildPlaceholderRounds(qualified: number): BracketRound[] {
  const names: Record<number, string> = { 8: "Quarti di finale", 4: "Semifinali", 2: "Finale" };
  const rounds: BracketRound[] = [];
  let teams = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, qualified))));
  while (teams >= 2) {
    rounds.push({
      label: names[teams] ?? `Turno a ${teams}`,
      ties: Array.from({ length: teams / 2 }, () => ({})),
    });
    teams = teams / 2;
  }
  return rounds;
}

/** Tabellone dalle partite della fase finale (quelle con `round`). */
export function buildBracketRounds(fixtures: Fixture[]): BracketRound[] {
  const ko = fixtures.filter((f) => f.round);
  const labels = [...new Set(ko.map((f) => f.round!))].sort((a, b) => roundOrder(a) - roundOrder(b));
  return labels.map((label) => ({
    label,
    ties: ko
      .filter((f) => f.round === label)
      .sort((a, b) => (a.bracket_slot ?? 0) - (b.bracket_slot ?? 0))
      .map((f) => {
        const played = f.status !== "scheduled" && f.home_score != null && f.away_score != null;
        const w = fixtureWinner(f);
        return {
          date: f.match_date,
          home: { name: f.home_team, score: played ? f.home_score : null, penalties: f.home_penalties, winner: w === "home", pending: isPlaceholderName(f.home_team, f.home_source) },
          away: { name: f.away_team, score: played ? f.away_score : null, penalties: f.away_penalties, winner: w === "away", pending: isPlaceholderName(f.away_team, f.away_source) },
        };
      }),
  }));
}

function formatDay(iso?: string | null) {
  if (!iso) return null;
  const [, mo, d] = iso.slice(0, 10).split("-");
  const time = iso.slice(11, 16);
  return `${d}/${mo}${time && time !== "00:00" ? ` · ${time}` : ""}`;
}

/** Loghi per squadra, con chiave `teamKey(nome)` (tabella team_logos). */
export type TeamLogos = Record<string, string>;

function TieCard({ tie, logos }: { tie: Tie; logos?: TeamLogos }) {
  const rows = [tie.home, tie.away];
  const decided = rows.some((s) => s?.winner);
  const penalties = rows.every((s) => s?.penalties != null) ? `d.c.r. ${tie.home?.penalties}-${tie.away?.penalties}` : null;
  const known = rows.some((s) => s?.name);
  return (
    <div className={`rounded-xl border bg-surface-2/40 ${known ? "border-border" : "border-dashed border-border"}`}>
      <div className="divide-y divide-border/70">
        {rows.map((slot, i) => {
          const vch = slot?.name && !slot.pending && isVCH(slot.name);
          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 text-sm min-h-[38px] ${vch ? "bg-brand/30" : ""} ${decided && !slot?.winner ? "opacity-55" : ""}`}
            >
              {logos && slot?.name && !slot.pending && <TeamLogo src={logos[teamKey(slot.name)]} name={slot.name} size={20} />}
              <span
                className={`flex-1 min-w-0 truncate ${
                  !slot?.name || slot.pending ? "text-muted text-xs italic" : slot.winner || vch ? "font-semibold" : ""
                }`}
              >
                {slot?.name ?? "Da definire"}
              </span>
              {slot?.score != null && <span className="tabular font-display font-bold">{slot.score}</span>}
            </div>
          );
        })}
      </div>
      {(penalties || (tie.date && rows.every((s) => s?.score == null))) && (
        <p className="px-3 py-1 text-[10px] text-muted border-t border-border/70">{penalties ?? formatDay(tie.date)}</p>
      )}
    </div>
  );
}

export default function Bracket({
  rounds,
  note,
  logos,
}: {
  rounds: BracketRound[];
  note?: string;
  logos?: TeamLogos;
}) {
  return (
    <div className="bento-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-draw" aria-hidden />
        </span>
        <h3 className="font-display text-base font-bold">Fase finale</h3>
      </div>
      {note && <p className="text-xs text-muted mb-4 ml-10">{note}</p>}

      <div className="mt-4 -mx-5 px-5 overflow-x-auto">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(${rounds.length > 2 ? "170px" : "0"}, 1fr))` }}>
          {rounds.map((round) => (
            <section key={round.label} aria-label={round.label} className="min-w-0 flex flex-col">
              <h4 className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2 truncate">{round.label}</h4>
              <div className="flex flex-col justify-around flex-1 gap-3">
                {round.ties.map((tie, i) => (
                  <TieCard key={i} tie={tie} logos={logos} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
