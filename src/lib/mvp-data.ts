import { supabase } from "@/lib/supabase";
import { pollStatus, type MvpCandidate, type MvpPoll } from "@/lib/mvp";

export interface MvpPollWithCandidates extends MvpPoll {
  candidates: MvpCandidate[];
}

export interface MvpWinner {
  poll: MvpPoll;
  player: MvpCandidate;
  votes: number;
}

/** Tutte le votazioni con i candidati (foto comprese), dalla più recente. */
export async function getMvpPolls(): Promise<MvpPollWithCandidates[]> {
  const { data } = await supabase
    .from("mvp_polls")
    .select("id, title, month, opens_at, closes_at, mvp_candidates(players(id, slug, full_name, shirt_number, role, photo_url))")
    .order("month", { ascending: false })
    .order("opens_at", { ascending: false });
  type Row = MvpPoll & { mvp_candidates: { players: MvpCandidate | null }[] };
  return ((data as unknown as Row[]) ?? []).map(({ mvp_candidates, ...poll }) => ({
    ...poll,
    candidates: mvp_candidates
      .map((c) => c.players)
      .filter((p): p is MvpCandidate => !!p)
      .sort((a, b) => (a.shirt_number ?? 999) - (b.shirt_number ?? 999) || a.full_name.localeCompare(b.full_name)),
  }));
}

/**
 * La votazione da mettere in evidenza: quella aperta, altrimenti la prossima
 * in arrivo, altrimenti l'ultima chiusa (per mostrarne il vincitore).
 */
export function featuredPoll(polls: MvpPollWithCandidates[], now = Date.now()) {
  const withCandidates = polls.filter((p) => p.candidates.length > 0);
  const open = withCandidates.find((p) => pollStatus(p, now) === "open");
  if (open) return open;
  const upcoming = withCandidates
    .filter((p) => pollStatus(p, now) === "upcoming")
    .sort((a, b) => Date.parse(a.opens_at) - Date.parse(b.opens_at))[0];
  if (upcoming) return upcoming;
  return withCandidates
    .filter((p) => pollStatus(p, now) === "closed")
    .sort((a, b) => Date.parse(b.closes_at) - Date.parse(a.closes_at))[0] ?? null;
}

/** Voti per giocatore di una votazione. */
export async function getMvpResults(pollId: string): Promise<Record<string, number>> {
  const { data } = await supabase.rpc("mvp_results", { p_poll: pollId });
  const out: Record<string, number> = {};
  for (const r of (data as { player_id: string; votes: number }[]) ?? []) out[r.player_id] = Number(r.votes);
  return out;
}

/** Albo d'oro: il più votato di ogni votazione chiusa (a pari voti, entrambi). */
export async function getMvpWinners(polls: MvpPollWithCandidates[], now = Date.now()): Promise<MvpWinner[][]> {
  const closed = polls.filter((p) => p.candidates.length > 0 && pollStatus(p, now) === "closed");
  const results = await Promise.all(closed.map((p) => getMvpResults(p.id)));
  return closed
    .map((poll, i) => {
      const votes = results[i];
      const max = Math.max(0, ...Object.values(votes));
      if (max === 0) return [];
      return poll.candidates
        .filter((c) => votes[c.id] === max)
        .map((player) => ({ poll, player, votes: max }));
    })
    .filter((w) => w.length > 0);
}
