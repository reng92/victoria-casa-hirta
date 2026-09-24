"use client";
import { useEffect, useState } from "react";
import { Crown, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/ui/Avatar";

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  photo_url: string | null;
}

interface Props {
  matchId: string;
  awayTeam: string;
}

export default function MVPVoting({ matchId }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [voted, setVoted] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    fetchPlayers();
    fetchVotes();
    const stored = localStorage.getItem(`mvp-voted-${matchId}`);
    if (stored) { setVoted(true); setSelectedPlayer(stored); }

    const channel = supabase
      .channel(`mvp-${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_votes", filter: `match_id=eq.${matchId}` }, () => fetchVotes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  async function fetchPlayers() {
    const { data: lineups } = await supabase
      .from("match_lineups")
      .select("player_id")
      .eq("match_id", matchId);

    if (lineups && lineups.length > 0) {
      const ids = lineups.map(l => l.player_id);
      const { data } = await supabase
        .from("players")
        .select("id, full_name, shirt_number, role, photo_url")
        .in("id", ids);
      setPlayers((data as unknown as Player[]) ?? []);
    } else {
      const { data } = await supabase
        .from("players")
        .select("id, full_name, shirt_number, role, photo_url")
        .eq("is_active", true)
        .order("shirt_number");
      setPlayers((data as unknown as Player[]) ?? []);
    }
  }

  async function fetchVotes() {
    const { data } = await supabase
      .from("match_votes")
      .select("player_id")
      .eq("match_id", matchId);

    if (!data) return;
    const counts: Record<string, number> = {};
    data.forEach(v => { counts[v.player_id] = (counts[v.player_id] ?? 0) + 1; });
    setVotes(counts);
    setTotalVotes(data.length);
  }

  async function handleVote(playerId: string) {
    if (voted || loading) return;
    setLoading(true);
    const res = await fetch("/api/vote-mvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, player_id: playerId }),
    });
    const data = await res.json();
    if (data.error) {
      setMsg(data.error);
    } else {
      setVoted(true);
      setSelectedPlayer(playerId);
      localStorage.setItem(`mvp-voted-${matchId}`, playerId);
      setMsg("Voto registrato!");
      fetchVotes();
    }
    setLoading(false);
  }

  const sortedPlayers = [...players].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0));
  const winner = sortedPlayers[0];

  return (
    <div className="bento-card">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-draw" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold leading-tight">MVP della partita</h2>
            <p className="text-xs text-muted mt-0.5">
              {voted ? `${totalVotes} voti totali` : "Vota il migliore in campo"}
            </p>
          </div>
        </div>
        {voted && winner && (
          <div className="text-right shrink-0">
            <p className="text-[11px] uppercase tracking-wider text-muted">In testa</p>
            <p className="font-semibold text-accent-soft text-sm truncate max-w-[140px]">{winner.full_name}</p>
          </div>
        )}
      </div>

      {msg && (
        <p className="px-5 py-2 bg-win/10 text-win text-sm font-medium text-center border-b border-border" role="status">
          {msg}
        </p>
      )}

      {players.length === 0 ? (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sortedPlayers.map((p) => {
            const voteCount = votes[p.id] ?? 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = selectedPlayer === p.id;
            const isWinner = voted && p.id === winner?.id && voteCount > 0;

            return (
              <button
                key={p.id}
                onClick={() => handleVote(p.id)}
                disabled={voted || loading}
                aria-pressed={isSelected}
                className={`relative flex flex-col items-center p-4 rounded-card border transition text-center ${
                  isWinner ? "border-draw/60 bg-draw/10" :
                  isSelected ? "border-brand-soft/60 bg-brand/30" :
                  voted ? "border-border bg-surface-2/40" :
                  "border-border bg-surface-2/40 hover:border-brand-soft/50 hover:bg-surface-2 cursor-pointer"
                }`}
              >
                {isWinner && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 bg-draw text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" aria-hidden /> MVP
                  </span>
                )}
                <Avatar src={p.photo_url} name={p.full_name} size={56} className="mb-2" />
                {p.shirt_number && (
                  <span className="text-[11px] font-bold text-accent-soft tabular mb-0.5">#{p.shirt_number}</span>
                )}
                <span className="font-semibold text-xs leading-tight">{p.full_name}</span>
                {voted && (
                  <div className="mt-2 w-full">
                    <div className="flex justify-between text-[11px] text-muted mb-1 tabular">
                      <span>{voteCount} voti</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-accent rounded-full h-1.5 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
