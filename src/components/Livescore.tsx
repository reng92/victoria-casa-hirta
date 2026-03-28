"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface LiveMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  live_minute: number | null;
  live_started_at: string | null;
  is_home: boolean;
  status: string;
  opponent_logo_url: string | null;
  competition: { name: string } | null;
}

interface LiveEvent {
  id: string;
  event_type: string;
  minute: number | null;
  player: { full_name: string } | null;
}

export default function Livescore() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [events, setEvents] = useState<Record<string, LiveEvent[]>>({});

  useEffect(() => {
    fetchLive();
    const channel = supabase
      .channel("livescore")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchLive())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, () => fetchLive())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchLive() {
    const { data } = await supabase
      .from("matches")
      .select("id, home_team, away_team, home_score, away_score, live_minute, live_started_at, is_home, status, opponent_logo_url, competition:competitions(name)")
      .eq("status", "live");
    const liveMatches = (data as unknown as LiveMatch[]) ?? [];
    setMatches(liveMatches);

    const eventsMap: Record<string, LiveEvent[]> = {};
    for (const m of liveMatches) {
      const { data: evs } = await supabase
        .from("match_events")
        .select("id, event_type, minute, player:players(full_name)")
        .eq("match_id", m.id)
        .in("event_type", ["gol", "autorete"])
        .order("minute", { ascending: true });
      eventsMap[m.id] = (evs as unknown as LiveEvent[]) ?? [];
    }
    setEvents(eventsMap);
  }

  if (matches.length === 0) return null;

  return (
    <div className="bg-brand-red text-white py-4 px-4">
      <div className="max-w-4xl mx-auto">
        {matches.map((m) => {
          const ourTeam = "Victoria Casa Hirta";
          const opponent = m.is_home ? m.away_team : m.home_team;
          const ourScore = m.is_home ? m.home_score : m.away_score;
          const theirScore = m.is_home ? m.away_score : m.home_score;
          const matchEvents = events[m.id] ?? [];

          return (
            <div key={m.id}>
              {/* Header live */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                <span className="text-xs font-bold uppercase tracking-widest">Live</span>
                {m.competition && <span className="text-xs text-white/70">· {m.competition.name}</span>}
              </div>

              {/* Scoreboard */}
              <div className="flex items-center justify-center gap-6">
                {/* VCH */}
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                    <span className="text-xl font-bold">VCH</span>
                  </div>
                  <span className="text-xs text-white/80 text-center truncate max-w-24">Victoria Casa Hirta</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-4xl font-extrabold tracking-tight">
                    {ourScore ?? 0} – {theirScore ?? 0}
                  </div>
                  {m.live_minute !== null && m.live_minute !== undefined && m.live_minute > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                      <span className="text-sm font-bold text-white/90">{m.live_minute}'</span>
                    </div>
                  )}
                </div>

                {/* Avversario */}
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                    {m.opponent_logo_url ? (
                      <img src={m.opponent_logo_url} alt={opponent} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-xl">⚽</span>
                    )}
                  </div>
                  <span className="text-xs text-white/80 text-center truncate max-w-24">{opponent}</span>
                </div>
              </div>

              {/* Marcatori */}
              {matchEvents.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {matchEvents.map(ev => (
                    <span key={ev.id} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      ⚽ {ev.player?.full_name ?? "–"} {ev.minute ? `${ev.minute}'` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
