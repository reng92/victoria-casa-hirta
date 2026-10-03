import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { playerHref } from "@/lib/links";
import { firstName, inferModule, shortName } from "@/lib/formation";
import { VCHLogo } from "@/components/ui/TeamLogo";
import { initials } from "@/lib/format";

interface Player {
  id: string;
  slug: string | null;
  full_name: string;
  shirt_number: number | null;
  photo_url: string | null;
  role: string;
}

interface FormationRow {
  id: string;
  position_x: number;
  position_y: number;
  player: Player | null;
}

interface BenchRow {
  player: Player | null;
}

interface EventRow {
  event_type: string;
  minute: number | null;
  player_id: string | null;
  player_out_id: string | null;
  player: Player | null;
}

const PLAYER_FIELDS = "id, slug, full_name, shirt_number, photo_url, role";

async function getLineup(matchId: string) {
  const [{ data: formation }, { data: bench }, { data: events }, { data: coach }] = await Promise.all([
    supabase.from("match_formations").select(`id, position_x, position_y, player:players(${PLAYER_FIELDS})`).eq("match_id", matchId),
    supabase.from("match_lineups").select(`player:players(${PLAYER_FIELDS})`).eq("match_id", matchId).eq("is_starter", false),
    supabase
      .from("match_events")
      .select(`event_type, minute, player_id, player_out_id, player:players!match_events_player_id_fkey(${PLAYER_FIELDS})`)
      .eq("match_id", matchId)
      .or("for_team.eq.vch,for_team.is.null"),
    supabase.from("staff").select("full_name").ilike("role", "allenatore").limit(1).maybeSingle(),
  ]);
  return {
    formation: ((formation as unknown as FormationRow[]) ?? []).filter(f => f.player),
    bench: ((bench as unknown as BenchRow[]) ?? []).map(b => b.player).filter((p): p is Player => !!p),
    events: (events as unknown as EventRow[]) ?? [],
    coach: (coach as { full_name: string } | null)?.full_name ?? null,
  };
}

/** Eventi di un giocatore, per i badge sul campo e in panchina. */
function playerStats(events: EventRow[], playerId: string) {
  const mine = (...types: string[]) => events.filter(e => e.player_id === playerId && types.includes(e.event_type));
  const subOut = events.find(e => e.event_type === "cambio" && e.player_out_id === playerId);
  const subIn = events.find(e => e.event_type === "cambio" && e.player_id === playerId);
  return {
    goals: mine("gol", "rigore_segnato").length,
    ownGoals: mine("autorete").length,
    assists: mine("assist").length,
    yellow: mine("ammonizione").length > 0,
    red: mine("espulsione").length > 0,
    subOut: subOut ? { minute: subOut.minute } : null,
    subIn: subIn ? { minute: subIn.minute } : null,
  };
}

type Stats = ReturnType<typeof playerStats>;

const minuteLabel = (m: number | null) => (m != null ? `${m}'` : "");

/* ---------- Icone piccole ---------- */

function BallIcon({ own = false, className = "" }: { own?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <circle cx="8" cy="8" r="7.25" fill={own ? "#f87171" : "#fff"} stroke="#0b1220" strokeWidth="1.2" />
      <path d="M8 4.6l2.4 1.75-.9 2.85H6.5l-.9-2.85z" fill="#0b1220" />
      <path d="M8 .8v3.8M10.4 6.35l3.9-1.2M9.5 9.2l2.3 3.3M6.5 9.2l-2.3 3.3M5.6 6.35l-3.9-1.2" stroke="#0b1220" strokeWidth="1" />
    </svg>
  );
}

function CardIcon({ red }: { red: boolean }) {
  return <span className={`block w-[9px] h-[12px] rounded-[2px] shadow ${red ? "bg-loss" : "bg-draw"}`} aria-hidden />;
}

function AssistIcon({ className = "" }: { className?: string }) {
  // Scarpetta stilizzata, come negli altri livescore
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <circle cx="8" cy="8" r="7.5" fill="#fff" />
      <path d="M3.2 3.6h3l.9 2.9 4 1.3c1.4.45 2.1 1.2 2.1 2.1v.9H3.2z" fill="#0b1220" />
      <path d="M3.2 11.4h10v.5H3.2z" fill="#0b1220" />
      <path d="M4 12.2h1.1v1H4zM6.6 12.2h1.1v1H6.6zM9.2 12.2h1.1v1H9.2zM11.6 12.2h1.1v1h-1.1z" fill="#0b1220" />
      <path d="M7.9 7.5l.9-.9M9.3 8l.9-.9" stroke="#fff" strokeWidth=".7" strokeLinecap="round" />
    </svg>
  );
}

/** Sostituzione: freccia rossa (uscito) o verde (entrato) su pallino bianco. */
function SubIcon({ out, className = "" }: { out: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <circle cx="8" cy="8" r="7.5" fill="#fff" />
      <path d="M11.5 5.5H4.8m0 0l2-2m-2 2l2 2" stroke={out ? "#dc2626" : "#16a34a"} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 10.5h6.7m0 0l-2-2m2 2l-2 2" stroke={out ? "#16a34a" : "#dc2626"} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Giocatore in campo ---------- */

function PitchPlayer({ row, top, stats, isKeeper, rowSize }: { row: FormationRow; top: number; stats: Stats; isKeeper: boolean; rowSize: number }) {
  const p = row.player!;
  const label = `${p.shirt_number != null ? `${p.shirt_number}, ` : ""}${p.full_name}`;
  // Larghezza dell'etichetta: non oltre lo spazio del giocatore nella sua riga
  const width = `min(96px, ${Math.floor(94 / rowSize)}%)`;
  return (
    <Link
      href={playerHref(p)}
      aria-label={label}
      className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-[30%] group"
      style={{ left: `${row.position_x}%`, top: `${top}%`, width }}
    >
      <span className="relative">
        <span
          className={`relative block w-9 h-9 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 shadow-lg transition-transform group-hover:scale-105 ${
            isKeeper ? "border-draw bg-[#facc15]" : "border-white bg-brand"
          }`}
        >
          {p.photo_url ? (
            <Image src={p.photo_url} alt="" fill sizes="48px" className="object-cover object-top" />
          ) : (
            <span className={`absolute inset-0 flex items-center justify-center font-display font-bold text-sm tabular ${isKeeper ? "text-[#0b1220]" : "text-white"}`}>
              {p.shirt_number ?? initials(p.full_name)}
            </span>
          )}
        </span>

        {/* Badge eventi attorno al cerchio */}
        {/* Come Sofascore: cartellino in alto a sinistra, gol in alto a destra,
            assist a destra, sostituzione a sinistra */}
        {(stats.yellow || stats.red) && (
          <span className="absolute -top-0.5 -left-1.5 flex">
            <CardIcon red={stats.red} />
          </span>
        )}
        {(stats.goals > 0 || stats.ownGoals > 0) && (
          <span className="absolute -top-1 -right-2.5 flex items-center">
            {Array.from({ length: Math.min(stats.goals, 3) }).map((_, i) => (
              <BallIcon key={i} className={`w-4 h-4 drop-shadow ${i > 0 ? "-ml-1.5" : ""}`} />
            ))}
            {stats.goals > 3 && <span className="ml-0.5 text-[10px] font-bold text-white drop-shadow">×{stats.goals}</span>}
            {stats.ownGoals > 0 && <BallIcon own className={`w-4 h-4 drop-shadow ${stats.goals > 0 ? "-ml-1.5" : ""}`} />}
          </span>
        )}
        {stats.assists > 0 && (
          <span className="absolute top-1/2 -right-3 flex">
            {Array.from({ length: Math.min(stats.assists, 3) }).map((_, i) => (
              <AssistIcon key={i} className={`w-4 h-4 drop-shadow ${i > 0 ? "-ml-1.5" : ""}`} />
            ))}
          </span>
        )}
        {stats.subOut && (
          <span className="absolute top-1/2 -left-3 flex" title={`Sostituito ${minuteLabel(stats.subOut.minute)}`}>
            <SubIcon out className="w-4 h-4 drop-shadow" />
          </span>
        )}
      </span>

      {/* Nome completo: nome sopra, cognome (anche composto, "De Rosa") sotto */}
      <span className={`mt-1.5 max-w-full text-center ${rowSize >= 5 ? "text-[10px]" : "text-[11px]"} sm:text-xs font-semibold text-white leading-tight [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]`}>
        <span className="block truncate font-medium text-white/85">{firstName(p.full_name)}</span>
        <span className="block truncate">
          {p.shirt_number != null && <span className="text-white/70 tabular mr-1">{p.shirt_number}</span>}
          {shortName(p.full_name)}
        </span>
      </span>
    </Link>
  );
}

/* ---------- Campo ---------- */

function Pitch({ children }: { children: React.ReactNode }) {
  const line = "border-white/35";
  return (
    <div
      className="relative w-full overflow-hidden [--pitch-ratio:3/4] sm:[--pitch-ratio:1/1]"
      style={{
        aspectRatio: "var(--pitch-ratio)",
        background: "repeating-linear-gradient(180deg, #2e8b57 0 12.5%, #2a8150 12.5% 25%)",
      }}
    >
      <div className="absolute inset-0" aria-hidden>
        <div className={`absolute inset-3 border-2 ${line} rounded-sm`} />
        <div className={`absolute left-3 right-3 border-t-2 ${line}`} style={{ top: "50%" }} />
        <div className={`absolute border-2 ${line} rounded-full w-[24%] aspect-square`} style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-white/50" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
        {/* Area avversaria (in alto) */}
        <div className={`absolute border-2 border-t-0 ${line}`} style={{ top: "12px", left: "22%", right: "22%", height: "15%" }} />
        <div className={`absolute border-2 border-t-0 ${line}`} style={{ top: "12px", left: "37%", right: "37%", height: "6%" }} />
        {/* Nostra area (in basso) */}
        <div className={`absolute border-2 border-b-0 ${line}`} style={{ bottom: "12px", left: "22%", right: "22%", height: "15%" }} />
        <div className={`absolute border-2 border-b-0 ${line}`} style={{ bottom: "12px", left: "37%", right: "37%", height: "6%" }} />
        <div className={`absolute border-2 ${line} rounded-full w-[16%] aspect-square`} style={{ bottom: "calc(12px + 15%)", left: "50%", transform: "translate(-50%, 50%)", clipPath: "inset(0 0 50% 0)" }} />
      </div>
      {children}
    </div>
  );
}

/* ---------- Riga panchina ---------- */

function BenchPlayer({ player, stats }: { player: Player; stats: Stats }) {
  return (
    <li>
      <Link href={playerHref(player)} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-2 transition">
        <span className="relative w-9 h-9 rounded-full overflow-hidden bg-surface-2 border border-border shrink-0 flex items-center justify-center">
          {player.photo_url ? (
            <Image src={player.photo_url} alt="" fill sizes="36px" className="object-cover object-top" />
          ) : (
            <span className="font-display font-bold text-xs text-muted tabular">{player.shirt_number ?? initials(player.full_name)}</span>
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">
            {player.shirt_number != null && <span className="text-muted tabular mr-1.5">{player.shirt_number}</span>}
            {player.full_name}
          </span>
          <span className="block text-xs text-muted capitalize">{player.role}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {Array.from({ length: stats.goals }).map((_, i) => <BallIcon key={`g${i}`} className="w-4 h-4" />)}
          {stats.ownGoals > 0 && <BallIcon own className="w-4 h-4" />}
          {stats.assists > 0 && <AssistIcon className="w-4 h-4" />}
          {(stats.yellow || stats.red) && <CardIcon red={stats.red} />}
          {stats.subIn && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-win tabular">
              <SubIcon out={false} className="w-4 h-4" />
              {minuteLabel(stats.subIn.minute)}
              <span className="sr-only">entrato</span>
            </span>
          )}
          {stats.subOut && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-loss tabular">
              <SubIcon out className="w-4 h-4" />
              {minuteLabel(stats.subOut.minute)}
              <span className="sr-only">uscito</span>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/**
 * Formazione della Victoria in stile livescore: campo con i titolari e i loro
 * eventi (gol, assist, cartellini, sostituzioni), poi panchina e allenatore.
 * Degli avversari non abbiamo la formazione. Ritorna null se non c'è nulla.
 */
export default async function Formation({ matchId }: { matchId: string }) {
  const lineup = await getLineup(matchId);
  if (lineup.formation.length === 0 && lineup.bench.length === 0) return null;
  return <FormationView {...lineup} />;
}

export type LineupData = Awaited<ReturnType<typeof getLineup>>;

// Fascia verticale (in % del campo) occupata dai giocatori: dagli attaccanti in
// alto al portiere in basso, lasciando spazio per foto ed etichette.
const PITCH_TOP = 9;
const PITCH_BOTTOM = 84;

export function FormationView({ formation, bench, events, coach }: LineupData) {
  const module = formation.length === 11 ? inferModule(formation.map(f => ({ x: f.position_x, y: f.position_y }))) : null;
  const keeperY = Math.max(...formation.map(f => f.position_y));
  const forwardY = Math.min(...formation.map(f => f.position_y));
  // Le righe si distribuiscono su tutto il campo invece di lasciare vuota la parte alta
  const spread = keeperY - forwardY;
  const topOf = (y: number) => (spread > 0 ? PITCH_TOP + ((y - forwardY) / spread) * (PITCH_BOTTOM - PITCH_TOP) : 50);

  // Chi è entrato dalla panchina ma non è stato segnato tra le riserve
  const onPitch = new Set(formation.map(f => f.player!.id));
  const benchIds = new Set(bench.map(p => p.id));
  const extraSubs = events
    .filter(e => e.event_type === "cambio" && e.player && !onPitch.has(e.player.id) && !benchIds.has(e.player.id))
    .map(e => e.player!);
  // In panchina prima chi è entrato, in ordine di minuto, poi gli altri per numero
  const benchAll = [...bench, ...extraSubs]
    .map(p => ({ player: p, stats: playerStats(events, p.id) }))
    .sort((a, b) =>
      (a.stats.subIn ? a.stats.subIn.minute ?? 998 : 999) - (b.stats.subIn ? b.stats.subIn.minute ?? 998 : 999) ||
      (a.player.shirt_number ?? 999) - (b.player.shirt_number ?? 999),
    );

  return (
    <div className="bento-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
        <span className="inline-flex items-center gap-2 text-sm font-semibold min-w-0">
          <VCHLogo size={24} />
          <span className="truncate">Victoria Casa Hirta</span>
        </span>
        {module && <span className="font-display font-bold tabular text-sm text-muted shrink-0">{module}</span>}
      </div>

      {formation.length > 0 && (
        <Pitch>
          <ul aria-label="Titolari">
            {formation.map(f => (
              <li key={f.id}>
                <PitchPlayer
                  row={f}
                  top={topOf(f.position_y)}
                  stats={playerStats(events, f.player!.id)}
                  isKeeper={f.player!.role === "portiere" || f.position_y === keeperY}
                  rowSize={formation.filter(o => Math.abs(o.position_y - f.position_y) <= 6).length}
                />
              </li>
            ))}
          </ul>
        </Pitch>
      )}

      {benchAll.length > 0 && (
        <div className="border-t border-border">
          <h3 className="px-5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Panchina</h3>
          <ul className="pb-2 sm:grid sm:grid-cols-2">
            {benchAll.map(b => <BenchPlayer key={b.player.id} player={b.player} stats={b.stats} />)}
          </ul>
        </div>
      )}

      {coach && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border text-sm">
          <span className="text-muted">Allenatore</span>
          <span className="font-semibold">{coach}</span>
        </div>
      )}
    </div>
  );
}
