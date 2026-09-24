import Link from "next/link";
import { Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";

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
    .eq("event_type", "gol");

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

const medal = ["text-draw", "text-muted", "text-[#c9856b]"];

export default async function TopScorers() {
  const scorers = (await getScorers()).slice(0, 3);

  return (
    <div className="bento-card p-5 h-full flex flex-col">
      <SectionHeader title="Cannonieri" icon={Target} href="/cannonieri" hrefLabel="Classifica" />
      {scorers.length === 0 ? (
        <EmptyState compact title="Nessun gol ancora" description="I marcatori compariranno dopo le prime partite." />
      ) : (
        <ol className="mt-4 flex flex-col gap-2 flex-1">
          {scorers.map((s, i) => (
            <li key={s.player_id}>
              <Link
                href={`/rosa/${s.player_id}`}
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-surface-2/60 transition"
              >
                <span className={`font-display font-bold tabular w-4 text-center ${medal[i] ?? "text-muted"}`}>{i + 1}</span>
                <Avatar src={s.photo_url} name={s.full_name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{s.full_name}</p>
                  <p className="text-[11px] text-muted capitalize">{s.role}</p>
                </div>
                <span className="font-display text-xl font-bold tabular text-accent-soft">{s.gol}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
