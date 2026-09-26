import { supabase } from "@/lib/supabase";
import { refreshPages } from "@/lib/revalidate";
import { Fixture, computeStandings, fixtureFromMatch, isGroupFormat, teamKey } from "@/lib/competitions";

export type SyncResult =
  | { status: "updated"; teams: number }
  | { status: "manual" }
  | { status: "error"; message: string };

const totalPlayed = (rows: { played: number | null }[]) => rows.reduce((sum, r) => sum + (r.played ?? 0), 0);

/**
 * Ricalcola la classifica di una competizione dai risultati (partite Victoria
 * + competition_results) e aggiorna le pagine pubbliche. Si chiama dopo ogni
 * salvataggio di un risultato.
 *
 * Classifiche inserite a mano (es. stagioni importate con le sole partite
 * della Victoria) contano più partite giocate di quelle registrate: in quel
 * caso non si tocca nulla, salvo `force`. Il margine di 2 lascia passare
 * l'eliminazione di una partita (una giocata in meno per ciascuna squadra).
 */
export async function syncStandings(competitionId: string | null | undefined, { force = false } = {}): Promise<SyncResult> {
  if (!competitionId) return { status: "manual" };
  const [{ data: comp }, { data: r }, { data: m }, { data: s }] = await Promise.all([
    supabase.from("competitions").select("format").eq("id", competitionId).single(),
    supabase.from("competition_results").select("id, match_date, matchday, group_name, round, home_team, away_team, home_score, away_score, status").eq("competition_id", competitionId),
    supabase.from("matches").select("id, match_date, matchday, group_name, home_team, away_team, is_home, home_score, away_score, status").eq("competition_id", competitionId),
    supabase.from("standings").select("id, team_name, group_name, played").eq("competition_id", competitionId),
  ]);
  const fixtures: Fixture[] = [
    ...((r as Omit<Fixture, "source">[]) ?? []).map((x) => ({ ...x, source: "result" as const })),
    ...((m as Parameters<typeof fixtureFromMatch>[0][]) ?? []).map(fixtureFromMatch),
  ];
  const current = (s as { id: string; team_name: string; group_name: string | null; played: number | null }[]) ?? [];
  const computed = computeStandings(fixtures, current, isGroupFormat(comp?.format));

  if (!force && totalPlayed(current) > totalPlayed(computed) + 2) return { status: "manual" };

  const existing = new Map(current.map((x) => [teamKey(x.team_name), x]));
  const errors: string[] = [];
  for (const row of computed) {
    const cur = existing.get(teamKey(row.team_name));
    const { error } = cur
      ? await supabase.from("standings").update({ ...row, team_name: cur.team_name }).eq("id", cur.id)
      : await supabase.from("standings").insert({ ...row, competition_id: competitionId });
    if (error) errors.push(error.message);
  }
  await refreshPages(["/", "/classifica", "/competizioni", "/storico"]);
  return errors.length ? { status: "error", message: errors.join(" · ") } : { status: "updated", teams: computed.length };
}

/** Testo breve da accodare ai messaggi dell'admin. */
export function syncMessage(res: SyncResult) {
  if (res.status === "updated") return " Classifica aggiornata.";
  if (res.status === "manual") return "";
  return ` Classifica non aggiornata: ${res.message}`;
}
