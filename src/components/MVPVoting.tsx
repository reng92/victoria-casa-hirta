"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  photo_url: string | null;
}

interface VoteCount {
  player_id: string;
  count: number;
}

interface Props {
  matchId: string;
  awayTeam: string;
}

export default function MVPVoting({ matchId, awayTeam }: Props) {
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
      setMsg("Voto registrato! 🎉");
      fetchVotes();
    }
    setLoading(false);
  }

  const sortedPlayers = [...players].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0));
  const winner = sortedPlayers[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-brand-blue text-lg">🏆 MVP della partita</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {voted ? `${totalVotes} voti totali` : "Vota il migliore in campo!"}
          </p>
        </div>
        {voted && winner && (
          <div className="text-right">
            <div className="text-xs text-gray-400">In testa</div>
            <div className="font-bold text-brand-red text-sm">{winner.full_name}</div>
          </div>
        )}
      </div>

      {msg && (
        <div className="px-6 py-2 bg-green-50 text-green-700 text-sm font-medium text-center">
          {msg}
        </div>
      )}

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
              className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition text-center ${
                isWinner ? "border-yellow-400 bg-yellow-50" :
                isSelected ? "border-brand-blue bg-brand-blue/5" :
                voted ? "border-gray-100 bg-gray-50" :
                "border-gray-100 hover:border-brand-blue hover:shadow-md cursor-pointer"
              }`}
            >
              {isWinner && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  👑 MVP
                </div>
              )}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 mb-2 flex items-center justify-center">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">⚽</span>
                )}
              </div>
              {p.shirt_number && (
                <div className="text-xs font-bold text-brand-red mb-0.5">#{p.shirt_number}</div>
              )}
              <div className="font-semibold text-brand-blue text-xs leading-tight">{p.full_name}</div>
              {voted && (
                <div className="mt-2 w-full">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{voteCount} voti</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-brand-red rounded-full h-1.5 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
