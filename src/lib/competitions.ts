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

/**
 * Punteggio dal punto di vista della Victoria. Nel DB `home_score` è SEMPRE
 * il numero di gol della Victoria e `away_score` quello dell'avversario,
 * indipendentemente da `is_home` (il form admin li etichetta "Gol VCH" e
 * "Gol Avversario").
 */
export function getScores(m: { home_score: number | null; away_score: number | null }) {
  return { ours: m.home_score, theirs: m.away_score };
}

/**
 * Punteggio nell'ordine di visualizzazione "casa – trasferta": in trasferta
 * la Victoria va a destra, quindi i gol vanno scambiati rispetto al DB.
 */
export function getHomeAwayScores(m: { is_home: boolean; home_score: number | null; away_score: number | null }) {
  const { ours, theirs } = getScores(m);
  return m.is_home ? { home: ours, away: theirs } : { home: theirs, away: ours };
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

export const VCH_NAME = "Victoria Casa Hirta";

/**
 * Partita di una competizione con squadre e punteggi reali di casa/trasferta.
 * Unisce `competition_results` (partite tra altre squadre) e `matches` della
 * Victoria, che nel DB usano la convenzione avversario in away_team e
 * home_score = gol Victoria.
 */
export interface Fixture {
  source: "result" | "match";
  id: string;
  match_date: string | null;
  matchday: number | null;
  group_name: string | null;
  round: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

export function fixtureFromMatch(m: {
  id: string;
  match_date: string | null;
  matchday: number | null;
  group_name: string | null;
  away_team: string;
  home_team?: string | null;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
}): Fixture {
  const opponent = getOpponent(m);
  const { ours, theirs } = getScores(m);
  return {
    source: "match",
    id: m.id,
    match_date: m.match_date,
    matchday: m.matchday,
    group_name: m.group_name,
    round: null,
    home_team: m.is_home ? VCH_NAME : opponent,
    away_team: m.is_home ? opponent : VCH_NAME,
    home_score: m.is_home ? ours : theirs,
    away_score: m.is_home ? theirs : ours,
    status: m.status,
  };
}

/** Converte una partita con casa/trasferta reali nel formato di `matches`; null se la Victoria non gioca. */
export function fixtureToMatchFields(f: Pick<Fixture, "home_team" | "away_team" | "home_score" | "away_score">) {
  if (isVCH(f.home_team)) {
    return { is_home: true, away_team: f.away_team, home_score: f.home_score, away_score: f.away_score };
  }
  if (isVCH(f.away_team)) {
    return { is_home: false, away_team: f.home_team, home_score: f.away_score, away_score: f.home_score };
  }
  return null;
}

/** Ordina per giornata, poi data (senza giornata in fondo). */
export function sortFixtures<T extends Pick<Fixture, "matchday" | "match_date">>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ma = a.matchday ?? Number.MAX_SAFE_INTEGER;
    const mb = b.matchday ?? Number.MAX_SAFE_INTEGER;
    if (ma !== mb) return ma - mb;
    return (a.match_date ?? "").localeCompare(b.match_date ?? "");
  });
}

export interface ComputedStanding {
  team_name: string;
  group_name: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

export const teamKey = (name: string) => name.trim().toLowerCase();

/**
 * Classifica calcolata dalle partite terminate (3 punti vittoria, 1 pareggio).
 * Le partite con `round` (fase a eliminazione diretta) non contano; nei formati
 * a gironi contano solo quelle con girone. `seed` mantiene in classifica le
 * squadre senza partite e il loro girone.
 */
export function computeStandings(
  fixtures: Pick<Fixture, "home_team" | "away_team" | "home_score" | "away_score" | "status" | "group_name" | "round">[],
  seed: { team_name: string; group_name: string | null }[],
  groupFormat: boolean,
): ComputedStanding[] {
  const table = new Map<string, ComputedStanding>();
  const row = (name: string, group: string | null) => {
    const k = teamKey(name);
    let r = table.get(k);
    if (!r) {
      r = { team_name: name.trim(), group_name: group, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 };
      table.set(k, r);
    }
    if (!r.group_name && group) r.group_name = group;
    return r;
  };
  for (const s of seed) row(s.team_name, s.group_name);
  for (const f of fixtures) {
    if (f.status !== "finished" || f.home_score == null || f.away_score == null) continue;
    if (f.round) continue;
    if (groupFormat && !f.group_name) continue;
    const h = row(f.home_team, f.group_name);
    const a = row(f.away_team, f.group_name);
    h.played++; a.played++;
    h.goals_for += f.home_score; h.goals_against += f.away_score;
    a.goals_for += f.away_score; a.goals_against += f.home_score;
    if (f.home_score > f.away_score) { h.won++; a.lost++; h.points += 3; }
    else if (f.home_score < f.away_score) { a.won++; h.lost++; a.points += 3; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  return sortStandings([...table.values()]);
}
