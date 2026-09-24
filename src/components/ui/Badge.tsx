import type { Outcome } from "@/lib/format";

type Tone = "neutral" | "brand" | "accent" | "win" | "draw" | "loss" | "glass";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border border-border",
  brand: "bg-brand text-white",
  accent: "bg-accent text-white",
  win: "bg-win/15 text-win border border-win/25",
  draw: "bg-draw/15 text-draw border border-draw/25",
  loss: "bg-loss/15 text-loss border border-loss/25",
  glass: "bg-white/10 text-white border border-white/15 backdrop-blur",
};

export function Pill({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={`pill ${tones[tone]} ${className}`}>{children}</span>;
}

/** Badge LIVE con pallino pulsante rosso. */
export function LiveBadge({ minute, className = "" }: { minute?: number | null; className?: string }) {
  return (
    <span className={`pill bg-accent text-white shadow-glow ${className}`} aria-live="polite">
      <span className="relative flex w-2 h-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 animate-pulse-dot" />
        <span className="relative inline-flex rounded-full w-2 h-2 bg-white" />
      </span>
      Live{minute ? ` ${minute}'` : ""}
    </span>
  );
}

export function OutcomeBadge({ outcome, className = "" }: { outcome: Outcome; className?: string }) {
  const label = { win: "Vittoria", draw: "Pareggio", loss: "Sconfitta" }[outcome];
  return (
    <Pill tone={outcome} className={className}>
      {label}
    </Pill>
  );
}
