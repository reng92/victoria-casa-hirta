"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function Livescore() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [events, setEvents] = useState<Record<string, LiveEvent[]>>({});
  const [ticks, setTicks] = useState(0);

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
    <div className="bg-gradient-to-r from-brand-blue via-brand-blue to-brand-red text-white py-6 px-4 shadow-lg">
      <div className="max-w-2xl mx-auto">
        {matches.map((m) => {
          const ourScore = m.is_home ? m.home_score : m.away_score;
          const theirScore = m.is_home ? m.away_score : m.home_score;
          const opponent = m.is_home ? m.away_team : m.home_team;
          const matchEvents = events[m.id] ?? [];
          const vchGoals = matchEvents.filter(e => e.for_team === "vch" || e.for_team === null);
          const oppGoals = matchEvents.filter(e => e.for_team === "opponent");

          return (
            <div key={m.id}>
              {/* Badge LIVE + competizione */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="flex items-center gap-1.5 bg-brand-red text-white text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                  Live
                </span>
                {m.competition && (
                  <span className="text-xs text-white/70 font-medium">{m.competition.name}</span>
                )}
                {m.live_minute !== null && m.live_minute !== undefined && m.live_minute > 0 && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">{getCurrentMinute(m)}'</span>
                )}
              </div>

              {/* Scoreboard */}
              <div className="flex items-center justify-between gap-4">
                {/* VCH */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center border-2 border-white">
                    <img src="/logo.jpeg" alt="VCH" className="w-full h-full object-contain p-1" />
                  </div>
                  <span className="text-xs font-bold text-center text-white leading-tight">Victoria Casa Hirta</span>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="bg-white/10 rounded-2xl px-6 py-3 backdrop-blur">
                    <div className="text-5xl font-extrabold tracking-tight text-white tabular-nums">
                      {ourScore ?? 0}
                      <span className="text-white/40 mx-2 text-4xl">–</span>
                      {theirScore ?? 0}
                    </div>
                  </div>
                </div>

                {/* Avversario */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center border-2 border-white">
                    {m.opponent_logo_url ? (
                      <img src={m.opponent_logo_url} alt={opponent} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-3xl">⚽</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-center text-white leading-tight">{opponent}</span>
                </div>
              </div>

              {/* Marcatori divisi per squadra */}
              {matchEvents.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    {vchGoals.map(ev => (
                      <span key={ev.id} className="text-xs text-white/80 text-left">
                        ⚽ {ev.player?.full_name ?? "–"} {ev.minute ? `${ev.minute}'` : ""}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    {oppGoals.map(ev => (
                      <span key={ev.id} className="text-xs text-white/80 text-right">
                        {ev.minute ? `${ev.minute}'` : ""} ⚽ {m.away_team}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
