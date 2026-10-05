/**
 * Letture pubbliche delle competizioni (pagine /competizioni e home):
 * competizioni, classifiche, tutte le partite e loghi delle squadre.
 */
import { supabase } from "@/lib/supabase";
import {
  Fixture,
  MATCH_FIXTURE_COLUMNS,
  MatchFixtureRow,
  RESULT_COLUMNS,
  fixtureFromMatch,
  fixtureFromResult,
  isVCH,
  sortFixtures,
  sortStandings,
  teamKey,
} from "@/lib/competitions";
import { isPlaceholderName } from "@/lib/schedule";

export interface CompetitionRow {
  id: string;
  name: string;
  type: string | null;
  level: string | null;
  organizer: string | null;
  logo_url: string | null;
  format: string | null;
  status: string | null;
  notes: string | null;
  qualified_per_group: number | null;
  season: { name: string; is_current: boolean } | null;
}

export interface Standing {
  id: string;
  team_name: string;
  group_name: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
  competition_id: string;
}

export type CompFixture = Fixture & { competition_id: string };

/** Loghi per squadra, con chiave `teamKey(nome)` (tabella team_logos). */
export type TeamLogos = Record<string, string>;

/** Slug dell'URL di una competizione, ricavato dal nome ("Campania Cup" → "campania-cup"). */
export function competitionSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const competitionHref = (c: { name: string }) => `/competizioni/${competitionSlug(c.name)}`;

const statusOrder: Record<string, number> = { attiva: 0, in_arrivo: 1, conclusa: 2 };

/** In corso per prime, poi in arrivo, infine concluse; a parità per nome. */
export const byStatus = (a: Pick<CompetitionRow, "status" | "name">, b: Pick<CompetitionRow, "status" | "name">) =>
  (statusOrder[a.status ?? ""] ?? 1) - (statusOrder[b.status ?? ""] ?? 1) || a.name.localeCompare(b.name);

export async function getCompetitions(): Promise<CompetitionRow[]> {
  const { data } = await supabase
    .from("competitions")
    .select("id, name, type, level, organizer, logo_url, format, status, notes, qualified_per_group, season:seasons(name, is_current)")
    .order("name", { ascending: true });
  return (data as unknown as CompetitionRow[]) ?? [];
}

export async function getStandings(competitionId?: string): Promise<Standing[]> {
  let q = supabase
    .from("standings")
    .select("id, team_name, group_name, played, won, drawn, lost, goals_for, goals_against, points, competition_id")
    .order("group_name", { ascending: true, nullsFirst: true })
    .order("points", { ascending: false });
  if (competitionId) q = q.eq("competition_id", competitionId);
  const { data } = await q;
  return sortStandings((data as unknown as Standing[]) ?? []);
}

/** Partite delle competizioni: quelle tra altre squadre e quelle della Victoria. */
export async function getFixtures(competitionId?: string): Promise<CompFixture[]> {
  let r = supabase.from("competition_results").select(`competition_id, ${RESULT_COLUMNS}`);
  let m = supabase.from("matches").select(`competition_id, ${MATCH_FIXTURE_COLUMNS}`).not("competition_id", "is", null);
  if (competitionId) {
    r = r.eq("competition_id", competitionId);
    m = m.eq("competition_id", competitionId);
  }
  const [{ data: rd }, { data: md }] = await Promise.all([r, m]);
  return sortFixtures([
    ...((rd as unknown as Omit<CompFixture, "source">[]) ?? []).map((x) => ({ ...fixtureFromResult(x), competition_id: x.competition_id })),
    ...((md as unknown as (MatchFixtureRow & { competition_id: string })[]) ?? []).map((x) => ({
      ...fixtureFromMatch(x),
      competition_id: x.competition_id,
    })),
  ]);
}

export async function getTeamLogos(): Promise<TeamLogos> {
  const { data } = await supabase.from("team_logos").select("team_name, logo_url");
  return Object.fromEntries(((data as { team_name: string; logo_url: string }[]) ?? []).map((r) => [teamKey(r.team_name), r.logo_url]));
}

/**
 * Partite della Victoria ancora senza data: restano in `competition_results`
 * finché l'admin non le programma, quindi non sono in `matches`.
 */
export async function getUnscheduledVCH(): Promise<(CompFixture & { competition: { name: string } | null })[]> {
  const { data } = await supabase
    .from("competition_results")
    .select(`competition_id, ${RESULT_COLUMNS}, competition:competitions(name)`)
    .is("match_date", null)
    .neq("status", "finished")
    .or("home_team.ilike.%victoria%,away_team.ilike.%victoria%");
  type Row = Omit<CompFixture, "source"> & { competition: { name: string } | null };
  return sortFixtures(
    ((data as unknown as Row[]) ?? [])
      .map((x) => ({ ...fixtureFromResult(x), competition_id: x.competition_id, competition: x.competition }))
      .filter((f) => (isVCH(f.home_team) || isVCH(f.away_team)) && !isPlaceholderName(f.home_team, f.home_source) && !isPlaceholderName(f.away_team, f.away_source)),
  );
}

export const levelLabel: Record<string, string> = {
  provinciale: "Provinciale",
  regionale: "Regionale",
  nazionale: "Nazionale",
};

export const typeLabel: Record<string, string> = {
  campionato: "Campionato",
  coppa: "Coppa",
  torneo: "Torneo",
};

export const statusTone = (s: string | null): "win" | "draw" | "neutral" => (s === "attiva" ? "win" : s === "in_arrivo" ? "draw" : "neutral");
