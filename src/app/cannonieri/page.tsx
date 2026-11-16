import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Target, Medal } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import TeamLogo from "@/components/ui/TeamLogo";
import Tabs from "@/components/ui/Tabs";
import { playerHref } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";
import { isVCH, teamKey } from "@/lib/competitions";
import { getTeamLogos, type TeamLogos } from "@/lib/competition-data";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Cannonieri",
  description:
    "Classifica marcatori del campionato e delle coppe del Victoria Casa Hirta, aggiornata in automatico dopo ogni giornata.",
  path: "/cannonieri",
});

interface PlayerRow {
  id: string;
  slug: string | null;
  full_name: string;
  photo_url: string | null;
}

interface ScorerLine {
  key: string;
  name: string;
  team: string;
  goals: number;
  /** Giocatore della rosa VCH, se il nome corrisponde. */
  player?: PlayerRow;
}

interface Board {
  key: string;
  label: string;
  scorers: ScorerLine[];
  updatedAt: string | null;
}

/** Chiave nome indipendente dall'ordine ("Merola Fabio" = "Fabio Merola"). */
const nameKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");

/** Etichetta breve della tab: "Campionato over 35 - 2026/27" → "Campionato". */
function shortLabel(name: string, type: string | null) {
  if (type === "campionato") return "Campionato";
  return name.replace(/\s*[-–]\s*\d{4}\/\d{2,4}$/, "").replace(/\s+\d{2}\/\d{2}$/, "");
}

async function getBoards(): Promise<{ boards: Board[]; logos: TeamLogos }> {
  const [{ data: comps }, { data: players }, logos] = await Promise.all([
    supabase.from("competitions").select("id, name, type").eq("status", "attiva").not("source_event", "is", null),
    supabase.from("players").select("id, slug, full_name, photo_url"),
    getTeamLogos(),
  ]);
  const list = (comps as { id: string; name: string; type: string | null }[]) ?? [];
  if (list.length === 0) return { boards: [], logos };

  const { data: rows } = await supabase
    .from("competition_scorers")
    .select("competition_id, source_id, player_name, team_name, goals, updated_at")
    .in("competition_id", list.map((c) => c.id))
    .order("goals", { ascending: false })
    .order("player_name", { ascending: true });

  const rosterList = (players as PlayerRow[]) ?? [];
  const roster = new Map(rosterList.map((p) => [nameKey(p.full_name), p]));
  // Nome esatto (in qualsiasi ordine), altrimenti l'unico giocatore i cui nomi
  // sono tutti contenuti in quello della fonte ("Ievoli Alessio Maria" → "Alessio Ievoli").
  const findPlayer = (sourceName: string) => {
    const key = nameKey(sourceName);
    const exact = roster.get(key);
    if (exact) return exact;
    const tokens = new Set(key.split(" "));
    const partial = rosterList.filter((p) => {
      const t = nameKey(p.full_name).split(" ");
      return t.length >= 2 && t.every((x) => tokens.has(x));
    });
    return partial.length === 1 ? partial[0] : undefined;
  };
  const all =
    (rows as { competition_id: string; source_id: string; player_name: string; team_name: string; goals: number; updated_at: string }[]) ??
    [];

  const boards = list
    .sort((a, b) => Number(b.type === "campionato") - Number(a.type === "campionato") || a.name.localeCompare(b.name))
    .map((c) => {
      const mine = all.filter((r) => r.competition_id === c.id);
      return {
        key: c.id,
        label: shortLabel(c.name, c.type),
        updatedAt: mine[0]?.updated_at ?? null,
        scorers: mine.map((r) => ({
          key: r.source_id,
          name: r.player_name,
          team: r.team_name,
          goals: r.goals,
          player: isVCH(r.team_name) ? findPlayer(r.player_name) : undefined,
        })),
      };
    })
    .filter((b) => b.scorers.length > 0);

  return { boards, logos };
}

const medalColor = ["text-draw", "text-muted", "text-[#c9856b]"];

function ScorerRow({ s, pos, logos }: { s: ScorerLine; pos: number; logos: TeamLogos }) {
  const vch = isVCH(s.team);
  const isPodium = pos <= 3;
  const name = s.player?.full_name ?? s.name;
  const body = (
    <>
      <span className="w-7 flex items-center justify-center shrink-0">
        {isPodium ? (
          <Medal className={`w-5 h-5 ${medalColor[pos - 1]}`} aria-label={`Posizione ${pos}`} />
        ) : (
          <span className="font-display font-bold tabular text-muted text-sm">{pos}</span>
        )}
      </span>
      {s.player ? (
        <Avatar src={s.player.photo_url} name={name} size={40} />
      ) : (
        <TeamLogo src={logos[teamKey(s.team)]} name={s.team} size={40} />
      )}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate text-sm ${vch ? "text-text" : "text-text/90"}`}>{name}</p>
        <p className="text-[11px] text-muted truncate flex items-center gap-1.5">
          {s.player && <TeamLogo src={logos[teamKey(s.team)]} name={s.team} size={14} />}
          {s.team}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-display font-bold tabular leading-none ${vch ? "text-accent-soft" : "text-text"} ${isPodium ? "text-2xl" : "text-xl"}`}>
          {s.goals}
        </p>
        <p className="text-[11px] uppercase tracking-wider text-muted mt-1">gol</p>
      </div>
    </>
  );
  const cls = `flex items-center gap-3 sm:gap-4 px-4 py-3 ${vch ? "bg-brand/15" : ""}`;
  return (
    <li>
      {s.player ? (
        <Link href={playerHref({ id: s.player.id, slug: s.player.slug })} className={`${cls} hover:bg-surface-2/60 tap`}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

function BoardView({ board, logos }: { board: Board; logos: TeamLogos }) {
  const total = board.scorers.reduce((sum, s) => sum + s.goals, 0);
  const vchGoals = board.scorers.filter((s) => isVCH(s.team)).reduce((sum, s) => sum + s.goals, 0);
  // Pari gol = stessa posizione (1, 2, 2, 4…)
  let lastGoals = -1;
  let lastPos = 0;
  const positions = board.scorers.map((s, i) => {
    if (s.goals !== lastGoals) {
      lastGoals = s.goals;
      lastPos = i + 1;
    }
    return lastPos;
  });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted px-1">
        {total} gol totali · {vchGoals} del VCH
        {board.updatedAt && (
          <>
            {" "}· aggiornata il{" "}
            {new Date(board.updatedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" })}
          </>
        )}
      </p>
      <div className="bento-card overflow-hidden">
        <ol className="stagger divide-y divide-border">
          {board.scorers.map((s, i) => (
            <ScorerRow key={s.key} s={s} pos={positions[i]} logos={logos} />
          ))}
        </ol>
      </div>
    </div>
  );
}

export default async function CannonieriPage() {
  const { boards, logos } = await getBoards();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Cannonieri" subtitle="Classifica marcatori delle competizioni in corso" />

      {boards.length === 0 ? (
        <div className="bento-card">
          <EmptyState icon={Target} title="Nessun gol ancora" description="I dati verranno aggiornati dopo le partite." />
        </div>
      ) : boards.length === 1 ? (
        <BoardView board={boards[0]} logos={logos} />
      ) : (
        <Tabs
          items={boards.map((b) => ({ key: b.key, label: b.label, content: <BoardView board={b} logos={logos} /> }))}
        />
      )}
    </div>
  );
}
