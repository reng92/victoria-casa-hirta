import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { isUuid, playerHref } from "@/lib/links";
import { ArrowLeft, Calendar, ClipboardList, Goal, Target, Square, ArrowLeftRight, ShieldAlert, Users, type LucideIcon } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Badge";
import { formatDateNumeric } from "@/lib/format";

export const revalidate = 60;

interface Player {
  slug: string | null;
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  birth_date: string | null;
  photo_url: string | null;
}

interface MatchEvent {
  id: string;
  event_type: string;
  minute: number | null;
  match: { match_date: string; away_team: string; home_score: number | null; away_score: number | null; is_home: boolean } | null;
}

async function getPlayer(key: string): Promise<Player | null> {
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq(isUuid(key) ? "id" : "slug", key)
    .single();
  return data as unknown as Player | null;
}

async function getStats(playerId: string) {
  const { data: events } = await supabase
    .from("match_events")
    .select("id, event_type, minute, match:matches(match_date, away_team, home_score, away_score, is_home)")
    .eq("player_id", playerId)
    .or("for_team.eq.vch,for_team.is.null")
    .order("created_at", { ascending: false });

  const { data: lineups } = await supabase
    .from("match_lineups")
    .select("id")
    .eq("player_id", playerId);

  const allEvents = (events as unknown as MatchEvent[]) ?? [];
  const gol = allEvents.filter(e => e.event_type === "gol" || e.event_type === "rigore_segnato").length;
  const assist = allEvents.filter(e => e.event_type === "assist").length;
  const ammonizioni = allEvents.filter(e => e.event_type === "ammonizione").length;
  const espulsioni = allEvents.filter(e => e.event_type === "espulsione").length;
  const presenze = lineups?.length ?? 0;

  return { gol, assist, ammonizioni, espulsioni, presenze, events: allEvents };
}

const roleLabel: Record<string, string> = {
  portiere: "Portiere",
  difensore: "Difensore",
  centrocampista: "Centrocampista",
  attaccante: "Attaccante",
};

const eventLabel: Record<string, string> = {
  gol: "Gol",
  assist: "Assist",
  ammonizione: "Ammonizione",
  espulsione: "Espulsione",
  cambio: "Sostituzione",
  autorete: "Autorete",
};

const eventIcon: Record<string, { icon: LucideIcon; color: string }> = {
  gol: { icon: Goal, color: "text-win" },
  assist: { icon: Target, color: "text-brand-soft" },
  ammonizione: { icon: Square, color: "text-draw" },
  espulsione: { icon: Square, color: "text-loss" },
  cambio: { icon: ArrowLeftRight, color: "text-muted" },
  autorete: { icon: ShieldAlert, color: "text-loss" },
};

export default async function GiocatorePage({ params }: { params: { slug: string } }) {
  const player = await getPlayer(params.slug);
  if (!player) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <div className="bento-card">
          <EmptyState icon={Users} title="Giocatore non trovato" description="Il profilo richiesto non esiste o non è più attivo." />
          <div className="pb-8 text-center">
            <Link href="/rosa" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-soft hover:text-text transition">
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Torna alla rosa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Vecchi link con l'UUID: redirect permanente all'URL leggibile
  if (player.slug && params.slug !== player.slug) permanentRedirect(playerHref(player));

  const stats = await getStats(player.id);

  const statCards: { value: number; label: string; icon: LucideIcon; color: string }[] = [
    { value: stats.presenze, label: "Presenze", icon: ClipboardList, color: "text-brand-soft" },
    { value: stats.gol, label: "Gol", icon: Goal, color: "text-win" },
    { value: stats.assist, label: "Assist", icon: Target, color: "text-brand-soft" },
    { value: stats.ammonizioni, label: "Ammonizioni", icon: Square, color: "text-draw" },
    { value: stats.espulsioni, label: "Espulsioni", icon: Square, color: "text-loss" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title={player.full_name} back={{ href: "/rosa", label: "Rosa" }} />

      {/* Header giocatore */}
      <section className="relative mesh-hero rounded-hero text-white overflow-hidden shadow-card mb-4 min-h-[180px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        {player.shirt_number !== null && (
          <span
            className="absolute -top-2 right-3 font-display font-bold text-white/10 leading-none tabular select-none"
            style={{ fontSize: "clamp(7rem, 30vw, 11rem)" }}
            aria-hidden
          >
            {player.shirt_number}
          </span>
        )}
        <div className="relative p-5 sm:p-7 flex items-center gap-5">
          <Avatar src={player.photo_url} name={player.full_name} size={96} rounded="xl" className="ring-4 ring-white/10 !bg-white/10 !border-white/15" />
          <div className="min-w-0">
            {player.shirt_number !== null && (
              <p className="font-display text-accent-soft font-bold text-4xl leading-none tabular mb-1">#{player.shirt_number}</p>
            )}
            <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight text-balance">{player.full_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Pill tone="glass" className="normal-case tracking-normal">{roleLabel[player.role] ?? player.role}</Pill>
              {player.birth_date && (
                <span className="text-xs text-white/70">Nato il {formatDateNumeric(player.birth_date)}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Statistiche */}
      <section aria-label="Statistiche" className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bento-card p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} aria-hidden />
              <p className="font-display text-2xl font-bold tabular leading-none">{s.value}</p>
              <p className="text-[11px] text-muted mt-1.5">{s.label}</p>
            </div>
          );
        })}
      </section>

      {/* Ultimi eventi */}
      <section className="bento-card" aria-labelledby="eventi-title">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-soft" aria-hidden />
          <h2 id="eventi-title" className="font-display text-base font-bold">Ultimi eventi</h2>
        </div>
        {stats.events.length === 0 ? (
          <EmptyState compact icon={ClipboardList} title="Nessun evento registrato" description="Gol, assist e cartellini compariranno qui." />
        ) : (
          <ul className="divide-y divide-border">
            {stats.events.slice(0, 10).map((ev) => {
              const meta = eventIcon[ev.event_type] ?? { icon: ClipboardList, color: "text-muted" };
              const Icon = meta.icon;
              return (
                <li key={ev.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${meta.color}`} aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{eventLabel[ev.event_type] ?? ev.event_type}</p>
                    {ev.match && (
                      <p className="text-muted text-xs truncate">
                        vs {ev.match.away_team} · {formatDateNumeric(ev.match.match_date)}
                      </p>
                    )}
                  </div>
                  {ev.minute && <span className="text-xs text-muted tabular shrink-0">{ev.minute}&apos;</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
