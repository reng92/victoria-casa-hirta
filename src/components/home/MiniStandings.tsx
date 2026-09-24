import { Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import { groupLabel, isVCH, sortStandings } from "@/lib/competitions";

interface Standing {
  id: string;
  team_name: string;
  group_name: string | null;
  played: number;
  goals_for: number;
  goals_against: number;
  points: number;
  competition: { id: string; name: string; status: string | null } | null;
}

const SELECT =
  "id, team_name, group_name, played, won, drawn, lost, goals_for, goals_against, points, competition:competitions(id, name, status)";

async function getStandings(): Promise<Standing[]> {
  const run = (select: string) => supabase.from("standings").select(select).order("points", { ascending: false });
  const { data, error } = await run(SELECT);
  const rows = error
    ? (await run(SELECT.replace("group_name, ", "").replace(", status", ""))).data
    : data;
  return sortStandings((rows as unknown as Standing[]) ?? []);
}

/**
 * Classifica compatta: prime 4 posizioni della competizione (e del girone)
 * in cui gioca la Victoria. Preferisce la competizione attiva.
 */
export default async function MiniStandings() {
  const all = await getStandings();
  const vchRows = all.filter((r) => isVCH(r.team_name));
  const vch = vchRows.find((r) => r.competition?.status === "attiva") ?? vchRows[0];
  const compId = vch?.competition?.id ?? all[0]?.competition?.id ?? null;
  const group = vch?.group_name ?? null;
  const rows = all.filter((r) => (r.competition?.id ?? null) === compId && (r.group_name ?? null) === group);
  const top = rows.slice(0, 4);
  const vchIndex = rows.findIndex((r) => isVCH(r.team_name));
  const showVchExtra = vch && vchIndex >= 4;

  const compName = vch?.competition?.name ?? all[0]?.competition?.name ?? null;
  const eyebrow = [compName, groupLabel(group)].filter(Boolean).join(" · ") || undefined;

  return (
    <div className="bento-card p-5 h-full flex flex-col">
      <SectionHeader title="Classifica" eyebrow={eyebrow} icon={Trophy} href="/classifica" hrefLabel="Completa" />
      {top.length === 0 ? (
        <EmptyState compact title="Classifica non disponibile" description="Verrà aggiornata dopo le prime giornate." />
      ) : (
        <ol className="mt-4 flex flex-col gap-1.5 flex-1">
          {top.map((r, i) => (
            <Row key={r.id} r={r} pos={i + 1} />
          ))}
          {showVchExtra && (
            <>
              <li aria-hidden className="text-center text-muted text-xs leading-none py-0.5">···</li>
              <Row r={vch} pos={vchIndex + 1} />
            </>
          )}
        </ol>
      )}
    </div>
  );
}

function Row({ r, pos }: { r: Standing; pos: number }) {
  const vch = isVCH(r.team_name);
  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
        vch ? "bg-brand/40 border-l-2 border-accent font-semibold" : "bg-surface-2/50"
      }`}
    >
      <span className={`w-5 text-center tabular text-xs ${pos === 1 ? "text-draw font-bold" : "text-muted"}`}>{pos}</span>
      <span className="flex-1 truncate">{r.team_name}</span>
      <span className="text-muted text-xs tabular">{r.played} g</span>
      <span className="font-display font-bold tabular w-8 text-right">{r.points}</span>
    </li>
  );
}
