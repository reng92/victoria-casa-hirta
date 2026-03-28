"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface LiveMatch {
  id: string;
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

function getCurrentMinute(m: LiveMatch): number {
  if (!m.live_minute_set_at || m.live_minute === null) return m.live_minute ?? 0;
  const setAt = new Date(m.live_minute_set_at).getTime();
  const elapsed = Math.floor((Date.now() - setAt) / 60000);
  return (m.live_minute ?? 0) + elapsed;
}

export default function LivescoreHome() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [events, setEvents] = useState<Record<string, LiveEvent[]>>({});
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    fetchLive();
    const channel = supabase
      .channel("livescore-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchLive())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, () => fetchLive())
      .subscribe();
    const timer = setInterval(() => setTicks(t => t + 1), 1000);
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, []);

  async function fetchLive() {
    const { data } = await supabase
      .from("matches")
      .select("id, away_team, home_score, away_score, is_home, status, opponent_logo_url, live_minute, live_minute_set_at, competition:competitions(name)")
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

  if (matches.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 mb-8">
      {matches.map((m) => {
        const ourScore = m.is_home ? m.home_score : m.away_score;
        const theirScore = m.is_home ? m.away_score : m.home_score;
        const opponent = m.away_team;
        const matchEvents = events[m.id] ?? [];
        const vchGoals = matchEvents.filter(e => e.for_team === "vch" || e.for_team === null);
        const oppGoals = matchEvents.filter(e => e.for_team === "opponent");
        const currentMinute = getCurrentMinute(m);

        return (
          <div key={m.id} className="bg-gradient-to-br from-brand-blue to-brand-red rounded-2xl shadow-xl p-6 text-white">
            {/* Badge */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                In corso
              </span>
              {m.competition && <span className="text-xs text-white/70">{m.competition.name}</span>}
              {currentMinute > 0 && (
                <span className="text-sm font-extrabold bg-white/20 px-3 py-0.5 rounded-full">
                  {currentMinute}'
                </span>
              )}
            </div>

            {/* Teams & Score */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-16 h-16 rounded-full bg-white shadow-lg overflow-hidden flex items-center justify-center border-2 border-white/30">
                  <img src="/logo.jpeg" alt="VCH" className="w-full h-full object-contain p-1" />
                </div>
                <span className="text-xs font-bold text-center leading-tight">Victoria Casa Hirta</span>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <div className="bg-white/15 rounded-2xl px-6 py-3">
                  <span className="text-5xl font-extrabold tabular-nums">
                    {ourScore ?? 0}
                    <span className="text-white/40 mx-2">–</span>
                    {theirScore ?? 0}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-16 h-16 rounded-full bg-white shadow-lg overflow-hidden flex items-center justify-center border-2 border-white/30">
                  {m.opponent_logo_url ? (
                    <img src={m.opponent_logo_url} alt={opponent} className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-3xl">⚽</span>
                  )}
                </div>
                <span className="text-xs font-bold text-center leading-tight">{opponent}</span>
              </div>
            </div>

            {/* Marcatori */}
            {matchEvents.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  {vchGoals.map(ev => (
                    <span key={ev.id} className="text-xs text-white/80">
                      ⚽ {ev.player?.full_name ?? "–"} {ev.minute ? `${ev.minute}'` : ""}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-1 text-right">
                  {oppGoals.map(ev => (
                    <span key={ev.id} className="text-xs text-white/80">
                      {ev.minute ? `${ev.minute}'` : ""} ⚽ {opponent}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
