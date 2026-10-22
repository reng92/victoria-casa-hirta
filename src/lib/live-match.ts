import { supabase } from "@/lib/supabase";
import { broadcastLive } from "@/lib/live-channel";

/**
 * Dati live di una partita: le select condivise tra la prima fetch (server),
 * il refetch al ritorno sulla pagina (browser) e le scritture dell'admin, che
 * inviano in broadcast la riga salvata nella stessa forma.
 */

export const PLAYER_FIELDS = "id, slug, full_name, shirt_number, photo_url, role";

export interface LivePlayer {
  id: string;
  slug: string | null;
  full_name: string;
  shirt_number: number | null;
  photo_url: string | null;
  role: string;
}

export const MATCH_SELECT =
  "id, slug, match_date, home_team, away_team, is_home, home_score, away_score, home_penalties, away_penalties, extra_time, status, matchday, group_name, round, notes, opponent_logo_url, instagram_reels, live_minute, live_period, match_report, venue:venues(name, address, city, maps_url), competition:competitions(name, type, level)";

export const EVENT_SELECT = `id, match_id, event_type, minute, for_team, player_id, player_out_id, player:players!match_events_player_id_fkey(${PLAYER_FIELDS}), player_out:players!match_events_player_out_id_fkey(full_name)`;

export interface LiveEvent {
  id: string;
  match_id: string;
  event_type: string;
  minute: number | null;
  for_team: string | null;
  player_id: string | null;
  player_out_id: string | null;
  player: LivePlayer | null;
  player_out: { full_name: string } | null;
}

export const COMMENTARY_SELECT = "id, match_id, minute, text, created_at";

export interface LiveCommentary {
  id: string;
  match_id: string;
  minute: number | null;
  text: string;
  created_at: string;
}

export const FORMATION_SELECT = `id, match_id, position_x, position_y, player:players(${PLAYER_FIELDS})`;

export interface FormationRow {
  id: string;
  match_id: string;
  position_x: number;
  position_y: number;
  player: LivePlayer | null;
}

export interface LiveState {
  events: LiveEvent[];
  commentary: LiveCommentary[];
  formation: FormationRow[];
  bench: LivePlayer[];
  coach: string | null;
}

/** Eventi, cronaca, formazione e panchina: un'unica fetch dello stato. */
export async function fetchLiveState(matchId: string): Promise<LiveState> {
  const [{ data: events }, { data: commentary }, { data: formation }, { data: bench }, { data: coach }] = await Promise.all([
    supabase.from("match_events").select(EVENT_SELECT).eq("match_id", matchId).order("minute", { ascending: true }),
    supabase.from("match_commentary").select(COMMENTARY_SELECT).eq("match_id", matchId),
    supabase.from("match_formations").select(FORMATION_SELECT).eq("match_id", matchId),
    supabase.from("match_lineups").select(`player:players(${PLAYER_FIELDS})`).eq("match_id", matchId).eq("is_starter", false),
    supabase.from("staff").select("full_name").ilike("role", "allenatore").limit(1).maybeSingle(),
  ]);
  return {
    events: (events as unknown as LiveEvent[]) ?? [],
    commentary: (commentary as LiveCommentary[] | null) ?? [],
    formation: (formation as unknown as FormationRow[]) ?? [],
    bench: ((bench as unknown as { player: LivePlayer | null }[]) ?? []).map((b) => b.player).filter((p): p is LivePlayer => !!p),
    coach: (coach as { full_name: string } | null)?.full_name ?? null,
  };
}

/* ---------- Scritture dell'admin: prima il DB, poi il broadcast ---------- */

type Fields = Record<string, unknown>;

export async function insertMatch(fields: Fields) {
  const res = await supabase.from("matches").insert(fields).select().single();
  if (!res.error) void broadcastLive(res.data.id, "matches", "insert", res.data);
  return res;
}

export async function updateMatch(id: string, fields: Fields) {
  const res = await supabase.from("matches").update(fields).eq("id", id).select().single();
  if (!res.error) void broadcastLive(id, "matches", "update", res.data);
  return res;
}

/** Stessa modifica su più partite (es. logo di un avversario). */
export async function updateMatches(ids: string[], fields: Fields) {
  const res = await supabase.from("matches").update(fields).in("id", ids).select();
  if (!res.error) for (const row of res.data ?? []) void broadcastLive(row.id, "matches", "update", row);
  return res;
}

export async function deleteMatch(id: string) {
  const res = await supabase.from("matches").delete().eq("id", id);
  if (!res.error) void broadcastLive(id, "matches", "delete", { id });
  return res;
}

export async function insertEvent(fields: Fields & { match_id: string }) {
  const res = await supabase.from("match_events").insert(fields).select(EVENT_SELECT).single();
  if (!res.error) void broadcastLive(fields.match_id, "match_events", "insert", res.data);
  return res;
}

export async function deleteEvent(matchId: string, id: string) {
  const res = await supabase.from("match_events").delete().eq("id", id);
  if (!res.error) void broadcastLive(matchId, "match_events", "delete", { id });
  return res;
}

export async function insertCommentary(fields: Fields & { match_id: string }) {
  const res = await supabase.from("match_commentary").insert(fields).select(COMMENTARY_SELECT).single();
  if (!res.error) void broadcastLive(fields.match_id, "match_commentary", "insert", res.data);
  return res;
}

export async function deleteCommentary(matchId: string, id: string) {
  const res = await supabase.from("match_commentary").delete().eq("id", id);
  if (!res.error) void broadcastLive(matchId, "match_commentary", "delete", { id });
  return res;
}
