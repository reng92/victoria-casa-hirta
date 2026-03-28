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
  competition: { name: string } | null;
}

export default function Livescore() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);

  useEffect(() => {
    fetchLive();

    const channel = supabase
      .channel("livescore")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        () => { fetchLive(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchLive() {
    const { data } = await supabase
      .from("matches")
      .select("id, home_team, away_team, home_score, away_score, is_home, status, competition:competitions(name)")
      .eq("status", "live");
    setMatches((data as LiveMatch[]) ?? []);
  }

  if (matches.length === 0) return null;

  return (
    <div className="bg-brand-red text-white py-3 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-center">
        {matches.map((m) => {
          const ourTeam = "Victoria Casa Hirta";
          const opponent = m.is_home ? m.away_team : m.home_team;
          const ourScore = m.is_home ? m.home_score : m.away_score;
          const theirScore = m.is_home ? m.away_score : m.home_score;

          return (
            <div key={m.id} className="flex items-center gap-3 text-sm font-bold">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                LIVE
              </span>
              <span>{m.competition?.name}</span>
              <span className="text-white/80">·</span>
              <span>{ourTeam}</span>
              <span className="text-2xl font-extrabold">
                {ourScore ?? 0} – {theirScore ?? 0}
              </span>
              <span>{opponent}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
