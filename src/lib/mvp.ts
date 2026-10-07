/**
 * MVP del mese. Apertura e chiusura delle votazioni sono istanti veri
 * (timestamptz), non orari "senza fuso" come matches.match_date: l'admin li
 * scrive in ora di Roma, qui si convertono in UTC, e si mostrano sempre con
 * timeZone Europe/Rome (Vercel gira in UTC, il telefono del tifoso può
 * essere ovunque).
 */

export const ROME_TZ = "Europe/Rome";

export interface MvpPoll {
  id: string;
  title: string;
  month: string;
  opens_at: string;
  closes_at: string;
}

export interface MvpCandidate {
  id: string;
  slug: string | null;
  full_name: string;
  shirt_number: number | null;
  role: string;
  photo_url: string | null;
}

export type MvpStatus = "upcoming" | "open" | "closed";

export function pollStatus(poll: Pick<MvpPoll, "opens_at" | "closes_at">, now = Date.now()): MvpStatus {
  if (now < Date.parse(poll.opens_at)) return "upcoming";
  if (now < Date.parse(poll.closes_at)) return "open";
  return "closed";
}

/** Scarto in minuti tra l'ora di Roma e UTC in quell'istante (60 o 120). */
function romeOffsetMinutes(ms: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ROME_TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** "2026-10-07T11:30" (ora di Roma, da <input type="datetime-local">) → ISO UTC. */
export function romeLocalToIso(local: string) {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error("Data non valida");
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Due passaggi per i giorni del cambio d'ora
  let ms = naive - romeOffsetMinutes(naive) * 60000;
  ms = naive - romeOffsetMinutes(ms) * 60000;
  return new Date(ms).toISOString();
}

/** ISO → "2026-10-07T11:30" in ora di Roma, per precompilare l'input. */
export function isoToRomeLocal(iso: string) {
  const ms = Date.parse(iso);
  const local = new Date(ms + romeOffsetMinutes(ms) * 60000);
  return local.toISOString().slice(0, 16);
}

/** "mercoledì 7 ottobre, 11:30" in ora di Roma. */
export function formatRomeDateTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("it-IT", { timeZone: ROME_TZ, weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("it-IT", { timeZone: ROME_TZ, hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
}

/** "Ottobre 2026" dal primo giorno del mese ("2026-10-01"). */
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("it-IT", { timeZone: "UTC", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Tempo rimanente leggibile: "2g 4h", "3h 12m", "45s". */
export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}g ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export const voteErrors: Record<string, string> = {
  not_found: "Votazione non trovata.",
  not_open: "Le votazioni non sono ancora aperte.",
  closed: "Le votazioni sono chiuse.",
  not_candidate: "Questo giocatore non è tra i candidati.",
  already_voted: "Hai già votato da questo dispositivo.",
  ip_limit: "Dalla tua rete sono già stati espressi troppi voti.",
  bad_device: "Impossibile registrare il voto da questo browser.",
};
