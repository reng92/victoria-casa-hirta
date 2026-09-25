"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TeamLogo, { VCHLogo } from "@/components/ui/TeamLogo";
import { LiveBadge } from "@/components/ui/Badge";
import { getHomeAwayScores, getOpponent, getScores } from "@/lib/competitions";

interface LiveMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  is_home: boolean;
  status: string;
  opponent_logo_url: string | null;
  live_minute: number | null;
  live_minute_set_at: string | null;
  competition: { name: string } | null;
}

interface LiveEvent {
  id: string;
  event_type: string;
  minute: number | null;
  for_team: string | null;
  player: { full_name: string } | null;
}

/**
 * Barra livescore globale (realtime). Compare sotto l'header solo quando
 * c'è una partita in corso.
 */
export default function Livescore() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [events, setEvents] = useState<Record<string, LiveEvent[]>>({});
  const [, setTicks] = useState(0);

  useEffect(() => {
    fetchLive();
    const channel = supabase
      .channel("livescore")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchLive())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, () => fetchLive())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTicks(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchLive() {
    const { data } = await supabase
      .from("matches")
      .select("id, home_team, away_team, home_score, away_score, is_home, status, opponent_logo_url, live_minute, live_minute_set_at, competition:competitions(name)")
      .eq("status", "live");
    const liveMatches = (data as unknown as LiveMatch[]) ?? [];
    setMatches(liveMatches);

    const eventsMap: Record<string, LiveEvent[]> = {};
    for (const m of liveMatches) {
      const { data: evs } = await supabase
        .from("match_events")
        .select("id, event_type, minute, for_team, player:players(full_name)")
        .eq("match_id", m.id)
        .in("event_type", ["gol", "autorete"])
        .order("minute", { ascending: true });
      eventsMap[m.id] = (evs as unknown as LiveEvent[]) ?? [];
    }
    setEvents(eventsMap);
  }

  function getCurrentMinute(m: LiveMatch): number {
    if (!m.live_minute_set_at || m.live_minute === null) return m.live_minute ?? 0;
    const setAt = new Date(m.live_minute_set_at).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - setAt) / 60000);
    return (m.live_minute ?? 0) + elapsedMinutes;
  }

  if (matches.length === 0) return null;

  return (
    <div className="sticky top-16 z-40 px-4 pt-2">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {matches.map((m) => {
          const { ours: ourScore, theirs: theirScore } = getScores(m);
          const { home: homeScore, away: awayScore } = getHomeAwayScores(m);
          const opponent = getOpponent(m);
          const matchEvents = events[m.id] ?? [];
          const vchGoals = matchEvents.filter(e => e.for_team === "vch" || e.for_team === null);
          const oppGoals = matchEvents.filter(e => e.for_team === "opponent");
          const minute = getCurrentMinute(m);

          return (
            <Link
              key={m.id}
              href={`/calendario/${m.id}`}
              className="glass rounded-card shadow-soft px-4 py-3 flex items-center gap-3 hover:bg-surface-2/80 transition"
              aria-label={`Partita in corso: Victoria Casa Hirta ${ourScore ?? 0} a ${theirScore ?? 0} ${opponent}`}
            >
              <LiveBadge minute={minute > 0 ? minute : null} />
              {/* Squadra di casa a sinistra */}
              <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
                <div className="flex items-center gap-2 min-w-0 justify-end flex-1">
                  <span className="text-xs font-semibold truncate hidden xs:block">{m.is_home ? "VCH" : opponent}</span>
                  {m.is_home ? <VCHLogo size={28} /> : <TeamLogo src={m.opponent_logo_url} name={opponent} size={28} />}
                </div>
                <span className="font-display text-2xl font-bold tabular leading-none shrink-0">
                  {homeScore ?? 0}<span className="text-muted mx-1.5">–</span>{awayScore ?? 0}
                </span>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {m.is_home ? <TeamLogo src={m.opponent_logo_url} name={opponent} size={28} /> : <VCHLogo size={28} />}
                  <span className="text-xs font-semibold truncate hidden xs:block">{m.is_home ? opponent : "VCH"}</span>
                </div>
              </div>
              {(vchGoals.length > 0 || oppGoals.length > 0) && (
                <span className="hidden sm:block text-[11px] text-muted truncate max-w-[180px]">
                  {[...vchGoals.map(e => `${e.player?.full_name ?? "Gol"} ${e.minute ?? ""}'`), ...oppGoals.map(e => `${opponent} ${e.minute ?? ""}'`)].join(" · ")}
                </span>
              )}
              {m.competition && (
                <span className="hidden md:block text-[11px] uppercase tracking-wider text-muted shrink-0">{m.competition.name}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
