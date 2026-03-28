"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface NextMatch {
  id: string;
  match_date: string;
  away_team: string;
  is_home: boolean;
  opponent_logo_url: string | null;
  competition: { name: string } | null;
}

export default function Countdown() {
  const [match, setMatch] = useState<NextMatch | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    fetchNext();
  }, []);

  useEffect(() => {
    if (!match) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(match.match_date).getTime();
      const diff = target - now;
      if (diff <= 0) { setExpired(true); clearInterval(interval); return; }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [match]);

  async function fetchNext() {
    const { data } = await supabase
      .from("matches")
      .select("id, match_date, away_team, is_home, opponent_logo_url, competition:competitions(name)")
      .eq("status", "scheduled")
      .gte("match_date", new Date().toISOString())
      .order("match_date", { ascending: true })
      .limit(1)
      .single();
    setMatch(data as unknown as NextMatch | null);
  }

  if (!match || expired) return null;

  const opponent = match.is_home ? match.away_team : "Victoria Casa Hirta";

  return (
    <div className="bg-brand-blue text-white py-6 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">
          {match.competition?.name ?? "Prossima partita"}
        </p>
        <p className="text-sm font-bold text-white/80 mb-4">
          VCH vs {match.away_team}
        </p>
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          {[
            { value: timeLeft.days, label: "Giorni" },
            { value: timeLeft.hours, label: "Ore" },
            { value: timeLeft.minutes, label: "Minuti" },
            { value: timeLeft.seconds, label: "Secondi" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <div className="bg-white/10 rounded-xl w-16 h-16 flex items-center justify-center text-3xl font-extrabold tabular-nums">
                {String(item.value).padStart(2, "0")}
              </div>
              <span className="text-xs text-white/50 mt-1">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
