import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, MapPin, Navigation, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import WeatherWidget from "@/components/WeatherWidget";
import LiveCountdown from "@/components/LiveCountdown";
import TeamLogo, { VCHLogo } from "@/components/ui/TeamLogo";
import { LiveBadge, Pill } from "@/components/ui/Badge";
import { formatDateLong, formatTime } from "@/lib/format";
import { getHomeAwayScores, getOpponent, matchContextLabel } from "@/lib/competitions";
import AnniversaryBadge from "@/components/AnniversaryBadge";
import { matchHref } from "@/lib/links";

interface Match {
  slug?: string | null;
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
  opponent_logo_url: string | null;
  venue: { name: string; address: string; city: string | null; maps_url: string | null } | null;
  competition: { name: string } | null;
}

const BASE_SELECT =
  "id, slug, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, opponent_logo_url, venue:venues(name, address, city, maps_url), competition:competitions(name)";

async function getNextMatch(): Promise<Match | null> {
  // Una partita "live" va mostrata anche se il calcio d'inizio è già passato.
  const query = (select: string) =>
    supabase
      .from("matches")
      .select(select)
      .or(`status.eq.live,and(status.eq.scheduled,match_date.gte.${new Date().toISOString()})`)
      .order("status", { ascending: true }) // "live" < "scheduled": live per primo
      .order("match_date", { ascending: true })
      .limit(1)
      .maybeSingle();

  const { data, error } = await query(BASE_SELECT.replace("matchday,", "matchday, group_name,"));
  if (error) {
    // Fallback se group_name non esiste ancora
    const { data: fallback } = await query(BASE_SELECT);
    return fallback as unknown as Match | null;
  }
  return data as unknown as Match | null;
}

/** Hero "prossima partita": gradient mesh, loghi, countdown live, CTA mappe. */
export default async function NextMatch() {
  const match = await getNextMatch();
  const opponent = match ? getOpponent(match) : "";

  return (
    <section
      aria-labelledby="next-match-title"
      className="relative mesh-hero rounded-hero text-white overflow-hidden min-h-[440px] md:min-h-[420px] flex flex-col shadow-card"
    >
      {/* Trama decorativa */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #fff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {!match ? (
        <div className="relative flex-1 flex flex-col items-center justify-center text-center p-8">
          <AnniversaryBadge size={96} priority className="mb-5" />
          <h1 id="next-match-title" className="font-display text-display">
            Victoria <span className="text-accent-soft">Casa Hirta</span>
          </h1>
          <p className="text-white/70 mt-3 max-w-md">
            Calcio amatoriale con passione e orgoglio in Campania.
          </p>
          <p className="mt-6 text-sm text-white/60">Nessuna partita in programma al momento.</p>
          <Link
            href="/calendario"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white text-brand-blue font-semibold px-5 py-2.5 text-sm hover:bg-white/90 transition"
          >
            Vai al calendario <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col p-5 sm:p-7 md:p-8">
          {/* Riga superiore: competizione + stato */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill tone="glass" className="normal-case tracking-normal">{matchContextLabel(match)}</Pill>
              <Pill tone="glass">{match.is_home ? "In casa" : "Trasferta"}</Pill>
            </div>
            <div className="flex items-center gap-3">
              {match.status === "live" ? (
                <LiveBadge />
              ) : (
                <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Prossima partita</p>
              )}
              <AnniversaryBadge size={36} className="hidden xs:block" />
            </div>
          </div>

          {/* Squadre: la squadra di casa a sinistra */}
          <div className={`flex-1 flex items-center justify-between gap-3 py-6 md:py-8 ${match.is_home ? "" : "flex-row-reverse"}`}>
            <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
              <VCHLogo size={72} priority className="ring-4 ring-white/10 md:!w-24 md:!h-24" />
              <h1
                id="next-match-title"
                className="font-display text-base sm:text-xl md:text-2xl font-bold text-center leading-tight text-balance"
              >
                Victoria Casa Hirta
              </h1>
            </div>

            <div className="flex flex-col items-center shrink-0 px-1">
              {match.status === "live" ? (
                <span className="font-display text-5xl md:text-6xl font-bold tabular leading-none">
                  {getHomeAwayScores(match).home ?? 0}
                  <span className="text-white/30 mx-2">–</span>
                  {getHomeAwayScores(match).away ?? 0}
                </span>
              ) : (
                <>
                  <span className="font-display text-4xl md:text-5xl font-bold text-white/25 leading-none">VS</span>
                  <span className="mt-2 text-sm font-semibold tabular text-white/80">{formatTime(match.match_date)}</span>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
              <TeamLogo
                src={match.opponent_logo_url}
                name={opponent}
                size={72}
                priority
                className="ring-4 ring-white/10 md:!w-24 md:!h-24"
              />
              <p className="font-display text-base sm:text-xl md:text-2xl font-bold text-center leading-tight text-balance">
                {opponent}
              </p>
            </div>
          </div>

          {/* Countdown */}
          {match.status !== "live" && (
            <div className="flex justify-center mb-5">
              <LiveCountdown target={match.match_date} />
            </div>
          )}

          {/* Data, ora, campo, meteo */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col gap-1.5 text-sm text-white/85 min-w-0">
              <p className="inline-flex items-center gap-2 capitalize">
                <CalendarDays className="w-4 h-4 text-white/60 shrink-0" aria-hidden />
                <span className="truncate">{formatDateLong(match.match_date)} · {formatTime(match.match_date)}</span>
              </p>
              {match.venue && (
                <p className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-white/60 shrink-0" aria-hidden />
                  <span className="truncate">
                    {match.venue.name}
                    {match.venue.city ? ` · ${match.venue.city}` : ""}
                  </span>
                </p>
              )}
              {match.venue?.city && (
                <Suspense fallback={null}>
                  <WeatherWidget matchDate={match.match_date} city={match.venue.city} variant="chip" />
                </Suspense>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {match.venue?.maps_url && (
                <a
                  href={match.venue.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-accent text-white font-semibold px-4 py-2.5 text-sm shadow-glow hover:brightness-110 transition"
                >
                  <Navigation className="w-4 h-4" aria-hidden />
                  Come arrivare
                </a>
              )}
              <Link
                href={matchHref(match)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur text-white font-semibold px-4 py-2.5 text-sm hover:bg-white/20 tap"
              >
                Dettagli <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
