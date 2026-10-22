import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { matchInstant } from "@/lib/format";

/**
 * Livescore con Realtime Broadcast su canali privati, uno per partita
 * ("partita:<match_id>"). L'admin invia la riga salvata dopo ogni scrittura
 * sul DB, il pubblico la applica allo stato locale senza rifare query.
 * Sostituisce postgres_changes, che consumava il Disk IO del database.
 *
 * Eventi: "<tabella>:<insert|update|delete>". Payload: la riga salvata (o un
 * array di righe), per delete `{ id }` oppure `{ match_id }` per tutte le
 * righe della partita. match_votes non passa di qui: i voti li inseriscono
 * gli utenti e si rileggono a intervalli.
 */

export type LiveTable = "matches" | "match_events" | "match_formations" | "match_commentary";
export type LiveAction = "insert" | "update" | "delete";
export interface LiveMessage {
  table: LiveTable;
  action: LiveAction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}
type Listener = (msg: LiveMessage) => void;

interface Entry {
  channel: RealtimeChannel;
  ready: Promise<void>;
  listeners: Set<Listener>;
  /** Canale dell'admin: resta aperto per riusarlo a ogni invio */
  pinned: boolean;
}

// Un solo canale per partita in tutta la pagina: la barra livescore e la
// pagina partita condividono la stessa sottoscrizione
const entries = new Map<string, Entry>();

export const liveTopic = (matchId: string) => `partita:${matchId}`;

function open(matchId: string): Entry {
  const existing = entries.get(matchId);
  if (existing) return existing;
  const channel = supabase.channel(liveTopic(matchId), { config: { private: true } });
  const listeners = new Set<Listener>();
  channel.on("broadcast", { event: "*" }, ({ event, payload }) => {
    const [table, action] = String(event).split(":") as [LiveTable, LiveAction];
    listeners.forEach((l) => l({ table, action, payload }));
  });
  const ready = (async () => {
    // Token della sessione (admin) o chiave anon: serve per i canali privati
    await supabase.realtime.setAuth();
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 10_000);
      channel.subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") console.warn(`[livescore] ${liveTopic(matchId)}:`, err?.message ?? status);
        clearTimeout(timeout);
        resolve();
      });
    });
  })();
  const entry: Entry = { channel, ready, listeners, pinned: false };
  entries.set(matchId, entry);
  return entry;
}

function release(matchId: string, entry: Entry) {
  if (entry.listeners.size > 0 || entry.pinned || entries.get(matchId) !== entry) return;
  entries.delete(matchId);
  supabase.removeChannel(entry.channel);
}

/** Ascolta i messaggi di una partita. Ritorna la funzione per smettere. */
export function listenToMatch(matchId: string, listener: Listener): () => void {
  const entry = open(matchId);
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
    release(matchId, entry);
  };
}

/**
 * Solo admin: invia una modifica già salvata sul DB. Non lancia errori: il
 * salvataggio è già riuscito, al massimo il pubblico la vede al refetch.
 */
export async function broadcastLive(matchId: string, table: LiveTable, action: LiveAction, payload: unknown) {
  try {
    const entry = open(matchId);
    entry.pinned = true;
    await entry.ready;
    await entry.channel.send({ type: "broadcast", event: `${table}:${action}`, payload });
  } catch (e) {
    console.warn("[livescore] invio non riuscito", e);
  }
}

/* ---------- Finestra in cui ha senso sottoscriversi ---------- */

const BEFORE_START = 30 * 60_000;
// Una partita programmata resta "in arrivo" anche se l'admin la mette in diretta in ritardo
const AFTER_START = 3 * 3_600_000;

/** In corso, oppure programmata e inizia entro 30 minuti. */
export function isInLiveWindow(m: { status: string; match_date: string }, now = Date.now()): boolean {
  if (m.status === "live") return true;
  if (m.status !== "scheduled") return false;
  const start = matchInstant(m.match_date);
  return now >= start - BEFORE_START && now <= start + AFTER_START;
}

/** Millisecondi al prossimo cambio di finestra (apertura o chiusura), o null. */
export function nextWindowChange(m: { status: string; match_date: string }, now = Date.now()): number | null {
  if (m.status !== "scheduled") return null;
  const start = matchInstant(m.match_date);
  const next = [start - BEFORE_START, start + AFTER_START].find((t) => t > now);
  // setTimeout non regge ritardi oltre ~24 giorni: oltre un giorno si ricontrolla
  return next == null ? null : Math.min(next - now + 1000, 86_400_000);
}

/* ---------- Applicare i payload allo stato locale ---------- */

type Row = { id: string };

/** Applica insert/update/delete a una lista di righe con id. */
export function applyRows<T extends Row>(list: T[], action: LiveAction, payload: unknown): T[] {
  if (action === "delete") {
    const p = payload as { id?: string; match_id?: string };
    if (p.id) return list.filter((r) => r.id !== p.id);
    return p.match_id ? [] : list;
  }
  const rows = (Array.isArray(payload) ? payload : [payload]) as T[];
  if (action === "update") return list.map((r) => ({ ...r, ...rows.find((x) => x.id === r.id) }));
  const ids = new Set(rows.map((r) => r.id));
  return [...list.filter((r) => !ids.has(r.id)), ...rows];
}

/** Tiene traccia di document.visibilityState. */
export function onVisibilityChange(cb: (visible: boolean) => void): () => void {
  const handler = () => cb(document.visibilityState === "visible");
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
