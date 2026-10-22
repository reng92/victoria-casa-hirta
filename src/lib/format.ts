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

/**
 * Data e ora di match_date (orario da parete salvato come UTC) lette in UTC:
 * escono uguali sul server e nel browser, per i componenti client.
 */
export function formatMatchDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMatchTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", {
    timeZone: "UTC",
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
 * Convenzione di matches.match_date (timestamptz): l'admin scrive l'ora
 * italiana e viene salvata come se fosse UTC. Una partita alle 21:00 di Roma
 * è "…T21:00:00+00", non "…T19:00:00+00".
 *
 * - Per MOSTRARE data e ora si legge in UTC (formatMatchTime, o le parti
 *   getUTC*): esce l'ora italiana giusta su server e browser.
 * - Per CONFRONTARE con l'ora attuale (countdown, live, prossime partite)
 *   si usa matchInstant, che reinterpreta l'orario come ora di Roma e dà
 *   l'istante vero; nelle query si usa nowAsMatchDate. Mai confrontare
 *   match_date con new Date()/Date.now()/toISOString() direttamente: si
 *   sbaglierebbe di 1-2 ore. Lato SQL l'equivalente è public.match_kickoff().
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
