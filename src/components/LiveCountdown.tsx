"use client";
import { useEffect, useState } from "react";

interface Props {
  /** ISO date della partita */
  target: string;
  className?: string;
}

function diff(target: string) {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    expired: false,
  };
}

/**
 * Countdown giorni / ore / minuti. Rende un placeholder stabile lato server
 * (nessun layout shift) e parte al mount.
 */
export default function LiveCountdown({ target, className = "" }: Props) {
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 30_000);
    return () => clearInterval(id);
  }, [target]);

  const cells = [
    { v: t?.days, l: "giorni" },
    { v: t?.hours, l: "ore" },
    { v: t?.minutes, l: "min" },
  ];

  if (t?.expired) {
    return (
      <p className={`text-sm font-semibold text-white/80 ${className}`} aria-live="polite">
        Si gioca oggi
      </p>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} role="timer" aria-label="Countdown alla prossima partita">
      {cells.map((c, i) => (
        <div key={c.l} className="flex items-center gap-2">
          <div className="flex flex-col items-center rounded-xl bg-white/10 border border-white/15 backdrop-blur px-2.5 py-1.5 min-w-[58px]">
            <span className="font-display text-2xl font-bold tabular leading-none text-white">
              {c.v === undefined ? "--" : String(c.v).padStart(2, "0")}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/60 mt-1">{c.l}</span>
          </div>
          {i < cells.length - 1 && <span className="text-white/30 font-bold -mt-3" aria-hidden>:</span>}
        </div>
      ))}
    </div>
  );
}
