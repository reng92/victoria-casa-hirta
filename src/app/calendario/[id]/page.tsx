import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  Clapperboard,
  Goal,
  Hand,
  MapPin,
  Navigation,
  StickyNote,
  Target,
  Users,
  CircleX,
  ClipboardList,
} from "lucide-react";
import MVPVoting from "@/components/MVPVoting";
import Formation from "@/components/Formation";
import WeatherWidget from "@/components/WeatherWidget";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import TeamLogo, { VCHLogo } from "@/components/ui/TeamLogo";
import { LiveBadge, OutcomeBadge, Pill } from "@/components/ui/Badge";
import { formatDateFull, formatTime, getOutcome } from "@/lib/format";
import { getHomeAwayScores, getOpponent, getScores, matchContextLabel } from "@/lib/competitions";

export const revalidate = 0;

interface Match {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
  matchday: number | null;
  group_name: string | null;
  notes: string | null;
  opponent_logo_url: string | null;
  instagram_reels: string[] | null;
  live_minute: number | null;
  live_period: string | null;
  venue: { name: string; address: string; city: string | null; maps_url: string | null } | null;
  competition: { name: string; type: string | null; level: string | null } | null;
}

interface MatchEvent {
  id: string;
  event_type: string;
  minute: number | null;
  for_team: string | null;
  player: { full_name: string; shirt_number: number | null } | null;
  player_out: { full_name: string } | null;
}

async function getMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, group_name, notes, opponent_logo_url, instagram_reels, live_minute, live_period, venue:venues(name, address, city, maps_url), competition:competitions(name, type, level)")
    .eq("id", id)
    .single();
  if (error) {
    // Fallback senza group_name / instagram_reels se le colonne non esistono ancora
    const { data: fallback } = await supabase
      .from("matches")
      .select("id, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, notes, opponent_logo_url, live_minute, live_period, venue:venues(name, address, city, maps_url), competition:competitions(name, type, level)")
      .eq("id", id)
      .single();
    return fallback as unknown as Match | null;
  }
  return data as unknown as Match | null;
}

function getInstagramEmbedUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

async function getEvents(matchId: string): Promise<MatchEvent[]> {
  const { data } = await supabase
    .from("match_events")
    .select("id, event_type, minute, for_team, player:players!match_events_player_id_fkey(full_name, shirt_number), player_out:players!match_events_player_out_id_fkey(full_name)")
    .eq("match_id", matchId)
    .order("minute", { ascending: true });
  return (data as unknown as MatchEvent[]) ?? [];
}

const eventLabel: Record<string, string> = {
  gol: "Gol",
  autorete: "Autorete",
  assist: "Assist",
  ammonizione: "Ammonizione",
  espulsione: "Espulsione",
  cambio: "Sostituzione",
  rigore_segnato: "Rigore segnato",
  rigore_parato: "Rigore parato",
  rigore_sbagliato: "Rigore sbagliato",
};

const periodLabel: Record<string, string> = {
  first_half: "Primo tempo",
  half_time: "Intervallo",
  second_half: "Secondo tempo",
  extra_time: "Supplementari",
  finished: "Terminata",
};

function EventIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "gol":
    case "rigore_segnato":
      return <Goal className={`${cls} text-win`} aria-hidden />;
    case "autorete":
      return <Goal className={`${cls} text-loss`} aria-hidden />;
    case "assist":
      return <Target className={`${cls} text-brand-soft`} aria-hidden />;
    case "ammonizione":
      return <span className="w-3 h-4 rounded-[2px] bg-draw inline-block" aria-hidden />;
    case "espulsione":
      return <span className="w-3 h-4 rounded-[2px] bg-loss inline-block" aria-hidden />;
    case "cambio":
      return <ArrowLeftRight className={`${cls} text-muted`} aria-hidden />;
    case "rigore_parato":
      return <Hand className={`${cls} text-brand-soft`} aria-hidden />;
    case "rigore_sbagliato":
      return <CircleX className={`${cls} text-loss`} aria-hidden />;
    default:
      return <ClipboardList className={`${cls} text-muted`} aria-hidden />;
  }
}

/* ------------------------------------------------------------------ */

export default async function PartitaPage({ params }: { params: { id: string } }) {
  const match = await getMatch(params.id);

  if (!match) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bento-card">
          <EmptyState
            title="Partita non trovata"
            description="Il link potrebbe essere errato o la partita è stata rimossa."
          />
          <div className="text-center pb-6">
            <Link href="/calendario" className="text-sm font-semibold text-accent-soft hover:text-text transition">
              Torna al calendario
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const events = await getEvents(match.id);
  const { ours: ourScore, theirs: theirScore } = getScores(match);
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const opponent = getOpponent(match);
  const outcome = isFinished ? getOutcome(ourScore, theirScore) : null;

  const vchEvents = events.filter(e => e.for_team === "vch" || e.for_team === null);
  const oppEvents = events.filter(e => e.for_team === "opponent");
  const timeline = [...events].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  const count = (list: MatchEvent[], ...types: string[]) => list.filter(e => types.includes(e.event_type)).length;
  const stats = [
    { label: "Gol", vch: count(vchEvents, "gol", "rigore_segnato"), opp: count(oppEvents, "gol", "rigore_segnato") },
    { label: "Assist", vch: count(vchEvents, "assist"), opp: count(oppEvents, "assist") },
    { label: "Ammonizioni", vch: count(vchEvents, "ammonizione"), opp: count(oppEvents, "ammonizione") },
    { label: "Espulsioni", vch: count(vchEvents, "espulsione"), opp: count(oppEvents, "espulsione") },
    { label: "Sostituzioni", vch: count(vchEvents, "cambio"), opp: count(oppEvents, "cambio") },
    { label: "Rigori", vch: count(vchEvents, "rigore_segnato", "rigore_sbagliato"), opp: count(oppEvents, "rigore_segnato", "rigore_sbagliato") },
  ].filter(s => s.vch + s.opp > 0);

  const { home: homeScore, away: awayScore } = getHomeAwayScores(match);
  const shareTeams = match.is_home ? `VCH vs ${opponent}` : `${opponent} vs VCH`;
  const shareText = `${shareTeams} · ${formatDateFull(match.match_date)}${isFinished ? ` · ${homeScore}–${awayScore}` : ""} · victoriacasahirta.it/calendario/${match.id}`;

  /* ---------- Tab: Cronaca ---------- */
  const cronaca = (
    <div className="flex flex-col gap-4">
      <div className="bento-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Tabellino</h2>
          {isLive && match.live_period && (
            <span className="text-xs text-muted">{periodLabel[match.live_period] ?? "In corso"}</span>
          )}
        </div>
        {timeline.length === 0 ? (
          <EmptyState compact icon={ClipboardList} title="Nessun evento registrato" description={isFinished ? "Il tabellino non è disponibile." : "Gli eventi compariranno durante la partita."} />
        ) : (
          <ol className="relative py-3">
            <span className="absolute left-1/2 top-3 bottom-3 w-px bg-border -translate-x-1/2" aria-hidden />
            {timeline.map((ev) => {
              const isVch = ev.for_team === "vch" || ev.for_team === null;
              const name = ev.player?.full_name ?? (isVch ? "–" : opponent);
              return (
                <li key={ev.id} className={`relative flex items-start gap-3 px-4 py-2 ${isVch ? "justify-start pr-[52%]" : "justify-end pl-[52%]"}`}>
                  <span className="absolute left-1/2 top-2.5 -translate-x-1/2 min-w-[34px] text-center text-[11px] font-bold tabular bg-surface-2 border border-border rounded-full px-1.5 py-0.5">
                    {ev.minute ? `${ev.minute}'` : "–"}
                  </span>
                  <div className={`flex items-center gap-2 min-w-0 ${isVch ? "" : "flex-row-reverse text-right"}`}>
                    <EventIcon type={ev.event_type} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{name}</p>
                      <p className="text-[11px] text-muted truncate">
                        {eventLabel[ev.event_type] ?? ev.event_type}
                        {ev.player_out ? ` · esce ${ev.player_out.full_name}` : ""}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {match.notes && (
        <div className="bento-card p-5">
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">
            <StickyNote className="w-3.5 h-3.5" aria-hidden /> Note
          </p>
          <p className="text-sm">{match.notes}</p>
        </div>
      )}

      {match.instagram_reels && match.instagram_reels.length > 0 && (
        <div className="bento-card">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-accent-soft" aria-hidden />
            <h2 className="font-display font-bold">Reels &amp; video</h2>
          </div>
          <div className="p-4 flex flex-col gap-5">
            {match.instagram_reels.map((url, i) => {
              const embedUrl = getInstagramEmbedUrl(url);
              return (
                <div key={i} className="w-full">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="w-full rounded-xl border-0 bg-surface-2"
                      height="520"
                      scrolling="no"
                      allowTransparency={true}
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      title={`Reel ${i + 1}`}
                      loading="lazy"
                    />
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-4 rounded-xl bg-accent text-white text-sm font-semibold hover:brightness-110 transition"
                    >
                      Apri reel {i + 1} su Instagram
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-black font-semibold px-6 py-3 rounded-full hover:brightness-105 transition text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Condividi su WhatsApp
        </a>
      </div>
    </div>
  );

  /* ---------- Tab: Formazioni ---------- */
  const formazioni = (
    <Suspense fallback={<div className="skeleton w-full" style={{ aspectRatio: "2 / 3" }} aria-busy="true" />}>
      <FormazioniTab matchId={match.id} />
    </Suspense>
  );

  /* ---------- Tab: Statistiche ---------- */
  const statistiche = (
    <div className="flex flex-col gap-4">
      <div className="bento-card p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-2 text-sm font-semibold"><VCHLogo size={22} /> VCH</span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold">{opponent} <TeamLogo src={match.opponent_logo_url} name={opponent} size={22} /></span>
        </div>
        {stats.length === 0 ? (
          <EmptyState compact title="Statistiche non disponibili" description="Verranno calcolate dagli eventi della partita." />
        ) : (
          <ul className="flex flex-col gap-3">
            {stats.map((s) => {
              const total = s.vch + s.opp || 1;
              return (
                <li key={s.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-display font-bold tabular w-8">{s.vch}</span>
                    <span className="text-[11px] uppercase tracking-wider text-muted">{s.label}</span>
                    <span className="font-display font-bold tabular w-8 text-right">{s.opp}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    <div className="flex-1 rounded-full bg-surface-2 overflow-hidden flex justify-end">
                      <span className="h-full bg-brand-soft rounded-full" style={{ width: `${(s.vch / total) * 100}%` }} />
                    </div>
                    <div className="flex-1 rounded-full bg-surface-2 overflow-hidden">
                      <span className="block h-full bg-accent rounded-full" style={{ width: `${(s.opp / total) * 100}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isFinished && (
        <MVPVoting matchId={match.id} awayTeam={opponent} />
      )}

      {match.venue?.city && !isFinished && (
        <Suspense fallback={<div className="skeleton h-40" aria-busy="true" />}>
          <WeatherWidget matchDate={match.match_date} city={match.venue.city} />
        </Suspense>
      )}

      {match.venue?.maps_url && (
        <div className="bento-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-display font-bold inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-accent-soft" aria-hidden />{match.venue.name}</h2>
            {match.venue.address && <p className="text-sm text-muted mt-0.5">{match.venue.address}{match.venue.city ? `, ${match.venue.city}` : ""}</p>}
          </div>
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(match.venue.address + (match.venue.city ? ", " + match.venue.city : ""))}&output=embed&z=15`}
            width="100%"
            height="200"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Mappa ${match.venue.name}`}
            className="block bg-surface-2 grayscale-[0.3]"
          />
          <a
            href={match.venue.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-accent-soft hover:text-text transition border-t border-border"
          >
            <Navigation className="w-4 h-4" aria-hidden /> Come arrivare
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <Link
        href="/calendario"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Partite
      </Link>

      {/* Header partita */}
      <section className="mesh-hero rounded-hero text-white shadow-card overflow-hidden mb-6" aria-labelledby="match-title">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 flex-wrap">
          <Pill tone="glass" className="normal-case tracking-normal">
            {matchContextLabel(match)}
          </Pill>
          {isLive && <LiveBadge minute={match.live_minute} />}
          {isFinished && outcome && <OutcomeBadge outcome={outcome} />}
          {!isFinished && !isLive && <Pill tone="glass" className="normal-case tracking-normal">Programmata</Pill>}
        </div>

        {/* Squadra di casa a sinistra */}
        <div className={`flex items-center justify-between gap-3 px-5 py-7 ${match.is_home ? "" : "flex-row-reverse"}`}>
          <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
            <VCHLogo size={72} priority className="ring-4 ring-white/10" />
            <h1 id="match-title" className="font-display text-sm sm:text-base font-bold text-center leading-tight">
              Victoria Casa Hirta <span className="sr-only">contro {opponent}</span>
            </h1>
            <span className="text-[11px] text-white/60">{match.is_home ? "Casa" : "Ospite"}</span>
          </div>

          <div className="flex flex-col items-center shrink-0">
            {isFinished || isLive ? (
              <>
                <span className="font-display text-5xl sm:text-6xl font-bold tabular leading-none">
                  {homeScore ?? 0}<span className="text-white/30 mx-2">–</span>{awayScore ?? 0}
                </span>
                {isLive && match.live_period && (
                  <span className="text-xs text-white/70 mt-2">{periodLabel[match.live_period] ?? "In corso"}</span>
                )}
              </>
            ) : (
              <>
                <span className="font-display text-4xl font-bold text-white/25 leading-none">VS</span>
                <span className="text-sm font-semibold tabular mt-2">{formatTime(match.match_date)}</span>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
            <TeamLogo src={match.opponent_logo_url} name={opponent} size={72} priority className="ring-4 ring-white/10" />
            <p className="font-display text-sm sm:text-base font-bold text-center leading-tight text-balance">{opponent}</p>
            <span className="text-[11px] text-white/60">{match.is_home ? "Ospite" : "Casa"}</span>
          </div>
        </div>

        <div className="px-5 py-4 bg-black/25 flex flex-col gap-1.5 text-sm text-white/85">
          <p className="inline-flex items-center gap-2 capitalize">
            <CalendarDays className="w-4 h-4 text-white/60 shrink-0" aria-hidden />
            {formatDateFull(match.match_date)}{!isFinished && !isLive ? ` · ${formatTime(match.match_date)}` : ""}
          </p>
          {match.venue && (
            <p className="inline-flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/60 shrink-0" aria-hidden />
              <span className="truncate">{match.venue.name}{match.venue.city ? ` · ${match.venue.city}` : ""}</span>
            </p>
          )}
        </div>
      </section>

      <Tabs
        variant="underline"
        items={[
          { key: "cronaca", label: "Cronaca", content: cronaca },
          { key: "formazioni", label: "Formazioni", content: formazioni },
          { key: "statistiche", label: "Statistiche", content: statistiche },
        ]}
      />
    </div>
  );
}

/** Tab formazioni: campo con giocatori o stato vuoto. */
async function FormazioniTab({ matchId }: { matchId: string }) {
  const field = await Formation({ matchId });
  if (!field) {
    return (
      <div className="bento-card">
        <EmptyState icon={Users} title="Formazione non disponibile" description="La formazione verrà pubblicata prima del calcio d'inizio." />
      </div>
    );
  }
  return field;
}
