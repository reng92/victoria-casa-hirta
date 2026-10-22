"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TeamLogo, { VCHLogo } from "@/components/ui/TeamLogo";
import { LiveBadge } from "@/components/ui/Badge";
import { getHomeAwayScores, getOpponent, getScores, matchResultNote } from "@/lib/competitions";
import { matchHref } from "@/lib/links";
import { nowAsMatchDate } from "@/lib/format";
import { applyRows, isInLiveWindow, listenToMatch, nextWindowChange, onVisibilityChange } from "@/lib/live-channel";

interface LiveMatch {
  slug?: string | null;
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
  extra_time?: boolean | null;
  is_home: boolean;
  status: string;
  opponent_logo_url: string | null;
  live_minute: number | null;
  live_minute_set_at: string | null;
  competition: { name: string } | null;
}

interface LiveEvent {
  id: string;
  match_id: string;
  event_type: string;
  minute: number | null;
  for_team: string | null;
  player: { full_name: string } | null;
}

const GOAL_TYPES = ["gol", "autorete"];
const byMinute = (a: LiveEvent, b: LiveEvent) => (a.minute ?? 999) - (b.minute ?? 999);

/**
 * Barra livescore globale. Compare sotto l'header solo quando c'è una partita
 * in corso. Legge le partite in corso o in arrivo e ascolta il canale broadcast
 * di ognuna finché la pagina è visibile.
 */
export default function Livescore() {
  const [candidates, setCandidates] = useState<LiveMatch[]>([]);
  const [events, setEvents] = useState<Record<string, LiveEvent[]>>({});
  const [visible, setVisible] = useState(true);
  const [clock, setClock] = useState(0);
  const [, setTicks] = useState(0);

  useEffect(() => {
    fetchLive();
    if (document.visibilityState !== "visible") setVisible(false);
    return onVisibilityChange((v) => {
      setVisible(v);
      if (v) fetchLive();
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTicks(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Prossima partita che entra nella finestra dei 30 minuti: si rilegge
  useEffect(() => {
    const waits = candidates.map(m => nextWindowChange(m)).filter((ms): ms is number => ms != null);
    if (waits.length === 0) return;
    const t = setTimeout(() => { setClock(c => c + 1); fetchLive(); }, Math.min(...waits));
    return () => clearTimeout(t);
  }, [candidates, clock]);

  const watched = visible ? candidates.filter(m => isInLiveWindow(m)).map(m => m.id).sort().join(",") : "";

  useEffect(() => {
    if (!watched) return;
    const offs = watched.split(",").map(id => listenToMatch(id, ({ table, action, payload }) => {
      if (table === "matches") {
        if (action === "update") setCandidates(list => list.map(m => (m.id === id ? { ...m, ...payload } : m)));
        if (action === "delete") setCandidates(list => list.filter(m => m.id !== id));
      }
      if (table === "match_events") {
        // Solo i gol: gli altri eventi non compaiono nella barra
        const rows = (Array.isArray(payload) ? payload : [payload]) as LiveEvent[];
        const goals = action === "delete" ? payload : rows.filter(e => GOAL_TYPES.includes(e.event_type));
        if (action !== "delete" && goals.length === 0) return;
        setEvents(map => ({ ...map, [id]: applyRows(map[id] ?? [], action, goals).sort(byMinute) }));
      }
    }));
    return () => offs.forEach(off => off());
  }, [watched]);

  async function fetchLive() {
    // In corso, oppure programmate da poco iniziate o in arrivo
    const { data } = await supabase
      .from("matches")
      .select("id, slug, match_date, home_team, away_team, home_score, away_score, home_penalties, away_penalties, extra_time, is_home, status, opponent_logo_url, live_minute, live_minute_set_at, competition:competitions(name)")
      .or(`status.eq.live,and(status.eq.scheduled,match_date.gte.${nowAsMatchDate(3)})`)
      .order("match_date", { ascending: true })
      .limit(10);
    const list = (data as unknown as LiveMatch[]) ?? [];
    setCandidates(list);

    const liveIds = list.filter(m => m.status === "live").map(m => m.id);
    const eventsMap: Record<string, LiveEvent[]> = {};
    if (liveIds.length > 0) {
      const { data: evs } = await supabase
        .from("match_events")
        .select("id, match_id, event_type, minute, for_team, player:players!match_events_player_id_fkey(full_name)")
        .in("match_id", liveIds)
        .in("event_type", GOAL_TYPES)
        .order("minute", { ascending: true });
      for (const e of (evs as unknown as LiveEvent[]) ?? []) (eventsMap[e.match_id] ??= []).push(e);
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

  const matches = candidates.filter(m => m.status === "live");
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
              href={matchHref(m)}
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
                <span className="flex flex-col items-center shrink-0">
                  <span className="font-display text-2xl font-bold tabular leading-none">
                    {homeScore ?? 0}<span className="text-muted mx-1.5">–</span>{awayScore ?? 0}
                  </span>
                  {matchResultNote(m) && <span className="text-[11px] font-semibold text-muted tabular mt-0.5">{matchResultNote(m)}</span>}
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
