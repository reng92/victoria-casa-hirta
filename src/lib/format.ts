/** Helper di formattazione data/ora (it-IT) condivisi dal layer visivo. */
import { isoToRomeLocal, romeLocalToIso } from "@/lib/mvp";

export function formatDateLong(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateNumeric(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT");
}

export function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWeekday(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", { weekday: "short" });
}

export function initials(name: string, n = 2) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, n)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export type Outcome = "win" | "draw" | "loss";

export function getOutcome(ours: number | null, theirs: number | null): Outcome | null {
  if (ours === null || theirs === null) return null;
  if (ours > theirs) return "win";
  if (ours < theirs) return "loss";
  return "draw";
}

export const outcomeLabel: Record<Outcome, string> = {
  win: "Vittoria",
  draw: "Pareggio",
  loss: "Sconfitta",
};

export const outcomeShort: Record<Outcome, string> = {
  win: "V",
  draw: "N",
  loss: "P",
};

/**
 * match_date è l'orario "da parete" di Roma scritto come UTC (21:00 → 21:00Z).
 * Per countdown e confronti con l'ora attuale serve l'istante vero.
 */
export function matchInstant(matchDate: string): number {
  return Date.parse(romeLocalToIso(matchDate.slice(0, 16)));
}

/**
 * L'ora attuale (meno `hoursBack`) nello stesso formato di match_date, per i
 * filtri nelle query: con un margine la partita resta in home anche se
 * l'admin non l'ha ancora messa in diretta.
 */
export function nowAsMatchDate(hoursBack = 0): string {
  return `${isoToRomeLocal(new Date(Date.now() - hoursBack * 3_600_000).toISOString())}:00Z`;
}
