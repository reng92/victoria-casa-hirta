/** Helper di formattazione data/ora (it-IT) condivisi dal layer visivo. */

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
