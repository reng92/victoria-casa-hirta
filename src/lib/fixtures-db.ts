/**
 * Lettura e scrittura delle partite di una competizione, sia quelle della
 * Victoria (`matches`) sia quelle tra altre squadre (`competition_results`).
 *
 * Una partita della Victoria finisce in `matches` (e quindi nel calendario
 * del sito) solo quando ha una data, perché lì `match_date` è obbligatoria:
 * le partite generate senza data restano in `competition_results` e vengono
 * spostate al primo salvataggio con la data.
 */
import { supabase } from "@/lib/supabase";
import {
  Fixture,
  MATCH_FIXTURE_COLUMNS,
  MatchFixtureRow,
  RESULT_COLUMNS,
  fixtureFromMatch,
  fixtureFromResult,
  fixtureToMatchFields,
  isVCH,
  sortFixtures,
} from "@/lib/competitions";
import { resolveBracket } from "@/lib/schedule";

export interface CompetitionInfo {
  id: string;
  name: string;
  format: string | null;
  status: string | null;
  legs: number;
  qualified_per_group: number;
}

export interface Seed {
  id: string;
  team_name: string;
  group_name: string | null;
  played: number | null;
}

export type FixtureFields = Omit<Fixture, "source" | "id">;

export async function loadCompetitionData(competitionId: string) {
  const [{ data: comp }, { data: r }, { data: m }, { data: s }] = await Promise.all([
    supabase.from("competitions").select("id, name, format, status, legs, qualified_per_group").eq("id", competitionId).single(),
    supabase.from("competition_results").select(RESULT_COLUMNS).eq("competition_id", competitionId),
    supabase.from("matches").select(MATCH_FIXTURE_COLUMNS).eq("competition_id", competitionId),
    supabase.from("standings").select("id, team_name, group_name, played").eq("competition_id", competitionId),
  ]);
  const fixtures = sortFixtures([
    ...((r as unknown as Omit<Fixture, "source">[]) ?? []).map(fixtureFromResult),
    ...((m as unknown as MatchFixtureRow[]) ?? []).map(fixtureFromMatch),
  ]);
  return {
    competition: (comp as CompetitionInfo | null) ?? null,
    fixtures,
    seeds: ((s as Seed[]) ?? []),
  };
}

const resultRow = (f: FixtureFields) => ({
  match_date: f.match_date,
  matchday: f.matchday,
  group_name: f.group_name,
  round: f.round,
  bracket_slot: f.bracket_slot,
  home_team: f.home_team,
  away_team: f.away_team,
  home_score: f.home_score,
  away_score: f.away_score,
  home_penalties: f.home_penalties,
  away_penalties: f.away_penalties,
  home_source: f.home_source,
  away_source: f.away_source,
  status: f.status,
});

function matchRow(f: FixtureFields) {
  const vch = fixtureToMatchFields(f)!;
  return {
    match_date: f.match_date,
    matchday: f.matchday,
    group_name: f.group_name,
    round: f.round,
    bracket_slot: f.bracket_slot,
    home_source: f.home_source,
    away_source: f.away_source,
    status: f.status,
    ...vch,
  };
}

/** Logo già noto dell'avversario, per non doverlo ricaricare a ogni partita. */
async function knownLogo(opponent: string) {
  const { data } = await supabase
    .from("matches").select("opponent_logo_url")
    .ilike("away_team", opponent).not("opponent_logo_url", "is", null).limit(1);
  if (data?.[0]?.opponent_logo_url) return data[0].opponent_logo_url as string;
  // Altrimenti il logo della squadra caricato per le competizioni (team_logos)
  const { data: team } = await supabase
    .from("team_logos").select("logo_url").ilike("team_name", opponent.trim()).limit(1);
  return (team?.[0]?.logo_url as string | undefined) ?? null;
}

async function insertMatch(competitionId: string, f: FixtureFields) {
  const row = matchRow(f);
  return supabase.from("matches").insert({ ...row, competition_id: competitionId, opponent_logo_url: await knownLogo(row.away_team) });
}

const playsVCH = (f: Pick<FixtureFields, "home_team" | "away_team">) => isVCH(f.home_team) || isVCH(f.away_team);

/** Inserisce una partita nella tabella giusta. Restituisce un messaggio di errore o null. */
export async function insertFixture(competitionId: string, f: FixtureFields): Promise<string | null> {
  const { error } = playsVCH(f) && f.match_date
    ? await insertMatch(competitionId, f)
    : await supabase.from("competition_results").insert({ ...resultRow(f), competition_id: competitionId });
  return error?.message ?? null;
}

export async function insertFixtures(competitionId: string, rows: FixtureFields[]): Promise<string | null> {
  const others = rows.filter((f) => !(playsVCH(f) && f.match_date));
  if (others.length) {
    const { error } = await supabase.from("competition_results").insert(others.map((f) => ({ ...resultRow(f), competition_id: competitionId })));
    if (error) return error.message;
  }
  for (const f of rows.filter((x) => playsVCH(x) && x.match_date)) {
    const err = await insertFixture(competitionId, f);
    if (err) return err;
  }
  return null;
}

/**
 * Aggiorna una partita, spostandola tra `competition_results` e `matches`
 * quando serve (la Victoria entra o esce dalla partita, o riceve la data).
 */
export async function updateFixture(competitionId: string, current: Fixture, f: FixtureFields): Promise<string | null> {
  const vch = playsVCH(f);
  if (current.source === "match") {
    if (vch) {
      const { error } = await supabase.from("matches").update(matchRow({ ...f, match_date: f.match_date ?? current.match_date })).eq("id", current.id);
      return error?.message ?? null;
    }
    // La Victoria non gioca più questa partita (es. tabellone ricalcolato): si sposta solo se non ha ancora un risultato
    if (current.home_score != null || current.status !== "scheduled") {
      return `La partita ${current.home_team} – ${current.away_team} è nel calendario della Victoria con un risultato: correggila da Partite`;
    }
    const { error } = await supabase.from("competition_results").insert({ ...resultRow(f), competition_id: competitionId });
    if (error) return error.message;
    const { error: delError } = await supabase.from("matches").delete().eq("id", current.id);
    return delError?.message ?? null;
  }
  if (vch && f.match_date) {
    const { error } = await insertMatch(competitionId, f);
    if (error) return error.message;
    const { error: delError } = await supabase.from("competition_results").delete().eq("id", current.id);
    return delError?.message ?? null;
  }
  const { error } = await supabase.from("competition_results").update(resultRow(f)).eq("id", current.id);
  return error?.message ?? null;
}

export function fixtureFields(f: Fixture): FixtureFields {
  const { source: _s, id: _i, ...rest } = f;
  return rest;
}

/** Aggiorna i nomi del tabellone (qualificate e vincenti). Restituisce gli errori. */
export async function syncBracket(competitionId: string, fixtures: Fixture[], seeds: Seed[], legs: number) {
  const errors: string[] = [];
  for (const u of resolveBracket(fixtures, seeds, legs)) {
    const err = await updateFixture(competitionId, u.fixture, { ...fixtureFields(u.fixture), home_team: u.home_team, away_team: u.away_team });
    if (err) errors.push(err);
  }
  return errors;
}
