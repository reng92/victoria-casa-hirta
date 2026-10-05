import { supabase } from "@/lib/supabase";
import { refreshPages } from "@/lib/revalidate";
import { computeStandings, isGroupFormat, teamKey } from "@/lib/competitions";
import { loadCompetitionData, syncBracket } from "@/lib/fixtures-db";

export type SyncResult =
  | { status: "updated"; teams: number }
  | { status: "manual" }
  | { status: "error"; message: string };

const totalPlayed = (rows: { played: number | null }[]) => rows.reduce((sum, r) => sum + (r.played ?? 0), 0);

/**
 * Aggiorna il tabellone della fase finale (qualificate e vincenti), ricalcola
 * la classifica di una competizione dai risultati (partite Victoria +
 * competition_results) e aggiorna le pagine pubbliche. Si chiama dopo ogni
 * salvataggio di un risultato.
 *
 * Classifiche inserite a mano (es. stagioni importate con le sole partite
 * della Victoria) contano più partite giocate di quelle registrate: in quel
 * caso non si tocca nulla, salvo `force`. Il margine di 2 lascia passare
 * l'eliminazione di una partita (una giocata in meno per ciascuna squadra).
 */
export async function syncStandings(competitionId: string | null | undefined, { force = false } = {}): Promise<SyncResult> {
  if (!competitionId) return { status: "manual" };
  const { competition, fixtures, seeds } = await loadCompetitionData(competitionId);
  const errors = await syncBracket(competitionId, fixtures, seeds, competition?.legs ?? 1);

  const computed = computeStandings(fixtures, seeds, isGroupFormat(competition?.format));
  if (!force && totalPlayed(seeds) > totalPlayed(computed) + 2) {
    await refreshPages(["/", "/competizioni", "/competizioni/[slug]", "/calendario"]);
    return errors.length ? { status: "error", message: errors.join(" · ") } : { status: "manual" };
  }

  const existing = new Map(seeds.map((x) => [teamKey(x.team_name), x]));
  for (const row of computed) {
    const cur = existing.get(teamKey(row.team_name));
    const { error } = cur
      ? await supabase.from("standings").update({ ...row, team_name: cur.team_name }).eq("id", cur.id)
      : await supabase.from("standings").insert({ ...row, competition_id: competitionId });
    if (error) errors.push(error.message);
  }
  await refreshPages(["/", "/competizioni", "/competizioni/[slug]", "/storico", "/calendario"]);
  return errors.length ? { status: "error", message: errors.join(" · ") } : { status: "updated", teams: computed.length };
}

/** Testo breve da accodare ai messaggi dell'admin. */
export function syncMessage(res: SyncResult) {
  if (res.status === "updated") return " Classifica aggiornata.";
  if (res.status === "manual") return "";
  return ` Classifica non aggiornata: ${res.message}`;
}
