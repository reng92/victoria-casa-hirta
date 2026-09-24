import { Trophy } from "lucide-react";

interface Slot {
  name?: string | null;
}
interface Tie {
  home?: Slot;
  away?: Slot;
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

function TieCard({ tie }: { tie: Tie }) {
  const rows = [tie.home, tie.away];
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-2/40 divide-y divide-border/70">
      {rows.map((slot, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm min-h-[38px]">
          <span className="w-5 h-5 rounded-full bg-surface border border-border shrink-0" aria-hidden />
          <span className={slot?.name ? "font-semibold truncate" : "text-muted text-xs"}>
            {slot?.name ?? "Da definire"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Bracket({
  rounds,
  note,
}: {
  rounds: BracketRound[];
  note?: string;
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

      <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))` }}>
        {rounds.map((round) => (
          <section key={round.label} aria-label={round.label} className="min-w-0">
            <h4 className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2 truncate">{round.label}</h4>
            <div className="flex flex-col justify-around h-full gap-3">
              {round.ties.map((tie, i) => (
                <TieCard key={i} tie={tie} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
