import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Target, Medal } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";

export const revalidate = 0;

interface Scorer {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  role: string;
  gol: number;
}

async function getScorers(): Promise<Scorer[]> {
  const { data: events } = await supabase
    .from("match_events")
    .select("player_id")
    .or("for_team.eq.vch,for_team.is.null")
    .not("player_id", "is", null)
    .in("event_type", ["gol", "rigore_segnato"]);

  if (!events || events.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.player_id] = (counts[e.player_id] ?? 0) + 1;
  }

  const playerIds = Object.keys(counts);

  const { data: players } = await supabase
    .from("players")
    .select("id, full_name, photo_url, role")
    .in("id", playerIds);

  if (!players) return [];

  return players
    .map(p => ({
      player_id: p.id,
      full_name: p.full_name,
      photo_url: p.photo_url,
      role: p.role,
      gol: counts[p.id] ?? 0,
    }))
    .sort((a, b) => b.gol - a.gol);
}

const medalColor = ["text-draw", "text-muted", "text-[#c9856b]"];

function ScorerRow({ s, pos, total }: { s: Scorer; pos: number; total: number }) {
  const isPodium = pos <= 3;
  const pct = total > 0 ? Math.round((s.gol / total) * 100) : 0;
  return (
    <li>
      <Link
        href={`/rosa/${s.player_id}`}
        className={`flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-surface-2/60 transition ${
          pos === 1 ? "bg-brand/25" : ""
        }`}
      >
        <span className="w-7 flex items-center justify-center shrink-0">
          {isPodium ? (
            <Medal className={`w-5 h-5 ${medalColor[pos - 1]}`} aria-label={`Posizione ${pos}`} />
          ) : (
            <span className="font-display font-bold tabular text-muted text-sm">{pos}</span>
          )}
        </span>
        <Avatar src={s.photo_url} name={s.full_name} size={isPodium ? 48 : 40} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${isPodium ? "text-base" : "text-sm"}`}>{s.full_name}</p>
          <p className="text-[11px] text-muted capitalize">{s.role}</p>
          {isPodium && (
            <div className="mt-1.5 h-1 w-full max-w-[160px] rounded-full bg-surface-2 overflow-hidden" aria-hidden>
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`font-display font-bold tabular leading-none text-accent-soft ${isPodium ? "text-3xl" : "text-xl"}`}>{s.gol}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted mt-1">gol</p>
        </div>
      </Link>
    </li>
  );
}

export default async function CannonierigPage() {
  const scorers = await getScorers();
  const totalGoals = scorers.reduce((sum, s) => sum + s.gol, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Cannonieri" subtitle="Classifica marcatori stagione in corso">
        {scorers.length > 0 && (
          <div className="text-right shrink-0">
            <p className="font-display text-2xl font-bold tabular leading-none text-accent-soft">{totalGoals}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted mt-1">gol totali</p>
          </div>
        )}
      </PageHeader>

      {scorers.length === 0 ? (
        <div className="bento-card">
          <EmptyState icon={Target} title="Nessun gol ancora" description="I dati verranno aggiornati dopo le partite." />
        </div>
      ) : (
        <div className="bento-card">
          <ol className="divide-y divide-border">
            {scorers.map((s, i) => (
              <ScorerRow key={s.player_id} s={s} pos={i + 1} total={totalGoals} />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
