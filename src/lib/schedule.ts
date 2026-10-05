/**
 * Generazione automatica del calendario di una competizione: giornate dei
 * gironi (o del girone unico) e tabellone della fase finale. Funzioni pure:
 * le scritture sul DB sono in src/lib/fixtures-db.ts.
 *
 * Nel tabellone le squadre ancora da definire hanno un "source":
 *   'G:A:1'           → 1ª classificata del girone A
 *   'W:Semifinale:1'  → vincente della Semifinale 1
 * Il nome mostrato è un segnaposto ("1ª Girone A", "Vincente Semifinale 1")
 * finché il girone non è concluso o la partita non ha un vincente.
 */
import { Fixture, computeStandings, fixtureWinner, teamKey } from "@/lib/competitions";

export interface PlannedFixture {
  home_team: string;
  away_team: string;
  matchday: number;
}

type Pairing = { home: string; away: string; round: number };

/** Girone all'italiana con il metodo del cerchio (una squadra riposa se sono dispari). */
export function roundRobin(teams: string[]): Pairing[] {
  const list: (string | null)[] = [...teams];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const out: Pairing[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (!a || !b) continue;
      // Alterna casa e trasferta tra una giornata e l'altra
      const flip = (i + r) % 2 === 1;
      out.push({ home: flip ? b : a, away: flip ? a : b, round: r + 1 });
    }
    // La prima squadra resta ferma, le altre ruotano
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

/**
 * Partite mancanti di un girone (o girone unico), tenendo conto di quelle già
 * presenti: non duplica gli accoppiamenti già inseriti e le mette nella prima
 * giornata in cui entrambe le squadre sono libere.
 */
export function planGroupFixtures(
  teams: string[],
  existing: { home_team: string; away_team: string; matchday: number | null }[],
  legs: 1 | 2,
): PlannedFixture[] {
  const base = roundRobin(teams);
  const rounds = base.reduce((m, p) => Math.max(m, p.round), 0);
  const schedule = legs === 2 ? [...base, ...base.map((p) => ({ home: p.away, away: p.home, round: p.round + rounds }))] : base;

  const pairKey = (a: string, b: string) => [teamKey(a), teamKey(b)].sort().join("|");
  const done = new Map<string, { home: string }[]>();
  const busy = new Map<number, Set<string>>();
  const occupy = (md: number, a: string, b: string) => {
    if (!busy.has(md)) busy.set(md, new Set());
    busy.get(md)!.add(teamKey(a)).add(teamKey(b));
  };
  for (const e of existing) {
    const k = pairKey(e.home_team, e.away_team);
    done.set(k, [...(done.get(k) ?? []), { home: teamKey(e.home_team) }]);
    if (e.matchday) occupy(e.matchday, e.home_team, e.away_team);
  }

  const out: PlannedFixture[] = [];
  const seen = new Map<string, number>();
  for (const p of schedule) {
    const k = pairKey(p.home, p.away);
    const leg = (seen.get(k) ?? 0) + 1;
    seen.set(k, leg);
    const already = done.get(k) ?? [];
    if (already.length >= leg) continue;
    let home = p.home, away = p.away;
    // Andata già giocata: il ritorno va a campi invertiti rispetto a quella
    if (legs === 2 && already.length === 1 && already[0].home === teamKey(home)) [home, away] = [away, home];
    let md = legs === 2 && leg === 2 ? rounds + 1 : 1;
    while (busy.get(md)?.has(teamKey(home)) || busy.get(md)?.has(teamKey(away))) md++;
    occupy(md, home, away);
    out.push({ home_team: home, away_team: away, matchday: md });
  }
  return out.sort((a, b) => a.matchday - b.matchday);
}

/** Numero di partite di un girone completo. */
export function expectedGroupMatches(teams: number, legs: number) {
  return (teams * (teams - 1) / 2) * legs;
}

/* ------------------------------------------------------------------ */
/* Fase finale                                                         */
/* ------------------------------------------------------------------ */

export function roundName(teamsInRound: number) {
  const names: Record<number, string> = {
    2: "Finale",
    4: "Semifinale",
    8: "Quarti di finale",
    16: "Ottavi di finale",
    32: "Sedicesimi di finale",
    64: "Trentaduesimi di finale",
  };
  return names[teamsInRound] ?? `Turno a ${teamsInRound}`;
}

export function sourceLabel(source: string) {
  const g = /^G:([^:]+):(\d+)$/.exec(source);
  if (g) return `${g[2]}ª Girone ${g[1]}`;
  const w = /^W:(.+):(\d+)$/.exec(source);
  if (w) return `Vincente ${w[1]} ${w[2]}`;
  return source;
}

/** True se il nome è ancora un segnaposto del tabellone. */
export function isPlaceholderName(name: string, source: string | null | undefined) {
  return !!source && name === sourceLabel(source);
}

/** Ordine delle teste di serie nel tabellone: 4 → [1,4,2,3], 8 → [1,8,4,5,2,7,3,6]. */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

export interface Entrant {
  team: string;
  source: string | null;
}

export interface PlannedTie {
  round: string;
  bracket_slot: number;
  home_team: string;
  away_team: string;
  home_source: string | null;
  away_source: string | null;
}

/**
 * Tabellone completo, dal primo turno alla finale. Le squadre entrano
 * nell'ordine di testa di serie (la 1ª incontra l'ultima); se non sono una
 * potenza di 2 le prime passano direttamente al turno successivo.
 */
export function planKnockout(entrants: Entrant[]): PlannedTie[] {
  if (entrants.length < 2) return [];
  const size = 2 ** Math.ceil(Math.log2(entrants.length));
  let current: (Entrant | null)[] = seedOrder(size).map((s) => entrants[s - 1] ?? null);
  const ties: PlannedTie[] = [];
  for (let teams = size; teams >= 2; teams /= 2) {
    const round = roundName(teams);
    const next: (Entrant | null)[] = [];
    for (let k = 0; k < teams / 2; k++) {
      const a = current[2 * k];
      const b = current[2 * k + 1];
      if (a && b) {
        ties.push({ round, bracket_slot: k + 1, home_team: a.team, away_team: b.team, home_source: a.source, away_source: b.source });
        const source = `W:${round}:${k + 1}`;
        next.push({ team: sourceLabel(source), source });
      } else {
        next.push(a ?? b);
      }
    }
    current = next;
  }
  return ties;
}

/** Qualificate dai gironi in ordine di testa di serie: tutte le prime, poi le seconde, ... */
export function groupEntrants(groups: string[], qualifiedPerGroup: number): Entrant[] {
  const out: Entrant[] = [];
  for (let pos = 1; pos <= qualifiedPerGroup; pos++) {
    for (const g of groups) {
      const source = `G:${g}:${pos}`;
      out.push({ team: sourceLabel(source), source });
    }
  }
  return out;
}

/**
 * Nomi aggiornati delle squadre del tabellone: le qualificate quando il
 * girone è concluso (tutte le partite previste terminate), le vincenti quando
 * la partita ha un esito. Restituisce solo le partite da modificare.
 */
export function resolveBracket(
  fixtures: Fixture[],
  seeds: { team_name: string; group_name: string | null }[],
  legs: number,
): { fixture: Fixture; home_team: string; away_team: string }[] {
  const groupTable = new Map<string, string[] | null>();
  const groupResult = (g: string) => {
    if (!groupTable.has(g)) {
      const groupSeeds = seeds.filter((s) => s.group_name === g);
      const played = fixtures.filter((f) => !f.round && f.group_name === g);
      const finished = played.filter((f) => f.status === "finished" && f.home_score != null && f.away_score != null);
      const expected = expectedGroupMatches(groupSeeds.length, legs);
      const complete = expected > 0 && finished.length >= expected;
      groupTable.set(g, complete ? computeStandings(played, groupSeeds, true).filter((r) => r.group_name === g).map((r) => r.team_name) : null);
    }
    return groupTable.get(g);
  };

  const resolve = (source: string): string | null => {
    const g = /^G:([^:]+):(\d+)$/.exec(source);
    if (g) return groupResult(g[1])?.[Number(g[2]) - 1] ?? null;
    const w = /^W:(.+):(\d+)$/.exec(source);
    if (w) {
      const tie = fixtures.find((f) => f.round === w[1] && f.bracket_slot === Number(w[2]));
      if (!tie) return null;
      const winner = fixtureWinner(tie);
      if (!winner) return null;
      // Il nome della vincente può a sua volta dipendere da un turno precedente
      const name = winner === "home" ? tie.home_team : tie.away_team;
      const src = winner === "home" ? tie.home_source : tie.away_source;
      if (!src) return name;
      return resolve(src) ?? (isPlaceholderName(name, src) ? null : name);
    }
    return null;
  };

  const out: { fixture: Fixture; home_team: string; away_team: string }[] = [];
  for (const f of fixtures) {
    if (!f.round || (!f.home_source && !f.away_source)) continue;
    const home = f.home_source ? resolve(f.home_source) ?? sourceLabel(f.home_source) : f.home_team;
    const away = f.away_source ? resolve(f.away_source) ?? sourceLabel(f.away_source) : f.away_team;
    if (home !== f.home_team || away !== f.away_team) out.push({ fixture: f, home_team: home, away_team: away });
  }
  return out;
}
