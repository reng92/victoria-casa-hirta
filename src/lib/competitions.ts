/**
 * Helper condivisi per competizioni, gironi e classifiche.
 * Valori DB: competitions.format / competitions.status, matches.group_name,
 * standings.group_name (vedi supabase/migrations/2026-09-23_over35.sql).
 */

export type CompetitionFormat = "girone_unico" | "gironi_poi_eliminazione_diretta" | "eliminazione_diretta";
export type CompetitionStatus = "in_arrivo" | "attiva" | "conclusa";

export const formatLabel: Record<string, string> = {
  girone_unico: "Girone unico",
  gironi_poi_eliminazione_diretta: "Gironi + eliminazione diretta",
  eliminazione_diretta: "Eliminazione diretta",
};

export const statusLabel: Record<string, string> = {
  in_arrivo: "In arrivo",
  attiva: "In corso",
  conclusa: "Conclusa",
};

export const formatOptions: { value: CompetitionFormat; label: string }[] = [
  { value: "girone_unico", label: formatLabel.girone_unico },
  { value: "gironi_poi_eliminazione_diretta", label: formatLabel.gironi_poi_eliminazione_diretta },
  { value: "eliminazione_diretta", label: formatLabel.eliminazione_diretta },
];

export const statusOptions: { value: CompetitionStatus; label: string }[] = [
  { value: "in_arrivo", label: statusLabel.in_arrivo },
  { value: "attiva", label: statusLabel.attiva },
  { value: "conclusa", label: statusLabel.conclusa },
];

/** Gironi disponibili nei form admin. */
export const groupOptions = ["A", "B", "C", "D"] as const;

/** Numero di squadre che passano da ogni girone alla fase finale. */
export const QUALIFIED_PER_GROUP = 2;

export function isGroupFormat(format?: string | null) {
  return format === "gironi_poi_eliminazione_diretta";
}

export function groupLabel(group?: string | null) {
  return group ? `Girone ${group}` : null;
}

export function matchdayLabel(matchday?: number | null) {
  return matchday ? `${matchday}ª giornata` : null;
}

/** "Coppa Over 35 · Girone A · 1ª giornata" (le parti assenti vengono omesse). */
export function matchContextLabel(m: {
  competition?: { name: string } | null;
  group_name?: string | null;
  matchday?: number | null;
}) {
  return [m.competition?.name ?? "Amichevole", groupLabel(m.group_name), matchdayLabel(m.matchday)]
    .filter(Boolean)
    .join(" · ");
}

/** Versione breve per liste compatte: "Girone A · G1". */
export function matchContextShort(m: { group_name?: string | null; matchday?: number | null }) {
  return [groupLabel(m.group_name), m.matchday ? `G${m.matchday}` : null].filter(Boolean).join(" · ");
}

/**
 * Nome dell'avversario. Il form admin salva l'avversario sempre in away_team e
 * usa is_home per casa/trasferta; se il DB valorizza home_team con l'avversario
 * nelle trasferte, viene comunque gestito.
 */
export function getOpponent(m: { home_team?: string | null; away_team: string; is_home: boolean }) {
  if (m.is_home) return m.away_team;
  const home = m.home_team?.trim();
  if (home && !home.toLowerCase().includes("victoria")) return home;
  return m.away_team;
}

export interface StandingLike {
  group_name?: string | null;
  points: number;
  goals_for: number;
  goals_against: number;
}

/** Ordina: girone, punti desc, differenza reti desc, gol fatti desc. */
export function sortStandings<T extends StandingLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ga = a.group_name ?? "";
    const gb = b.group_name ?? "";
    if (ga !== gb) return ga.localeCompare(gb);
    if (b.points !== a.points) return b.points - a.points;
    const da = a.goals_for - a.goals_against;
    const db = b.goals_for - b.goals_against;
    if (db !== da) return db - da;
    return b.goals_for - a.goals_for;
  });
}

/** Raggruppa righe già ordinate per girone mantenendo l'ordine (A, B, ...). */
export function groupByGroupName<T extends { group_name?: string | null }>(rows: T[]) {
  const groups: { key: string; label: string; rows: T[] }[] = [];
  for (const r of rows) {
    const key = r.group_name ?? "";
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: groupLabel(r.group_name) ?? "Classifica", rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  }
  return groups;
}

export function isVCH(teamName: string) {
  return teamName.toLowerCase().includes("victoria");
}
