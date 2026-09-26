"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Match {
  id: string;
  match_date: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
}

interface Lineup {
  id: string;
  player_id: string;
  is_starter: boolean;
}

export default function AdminPresenze() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (selectedMatch) fetchLineups(selectedMatch);
    else setLineups([]);
  }, [selectedMatch]);

  async function fetchAll() {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("matches").select("id, match_date, away_team, is_home, home_score, away_score, status")
        .in("status", ["finished", "live"])
        .order("match_date", { ascending: false }),
      supabase.from("players").select("id, full_name, shirt_number, role")
        .eq("is_active", true)
        .order("role").order("shirt_number"),
    ]);
    setMatches((m as unknown as Match[]) ?? []);
    setPlayers((p as unknown as Player[]) ?? []);
  }

  async function fetchLineups(matchId: string) {
    const { data } = await supabase
      .from("match_lineups")
      .select("id, player_id, is_starter")
      .eq("match_id", matchId);
    setLineups((data as unknown as Lineup[]) ?? []);
  }

  function isInLineup(playerId: string): boolean {
    return lineups.some(l => l.player_id === playerId);
  }

  function isStarter(playerId: string): boolean {
    return lineups.some(l => l.player_id === playerId && l.is_starter);
  }

  async function togglePlayer(playerId: string, starter: boolean) {
    if (!selectedMatch) return;
    const existing = lineups.find(l => l.player_id === playerId);

    if (existing) {
      await supabase.from("match_lineups").delete().eq("id", existing.id);
    } else {
      await supabase.from("match_lineups").insert({
        match_id: selectedMatch,
        player_id: playerId,
        is_starter: starter,
      });
    }
    fetchLineups(selectedMatch);
  }

  async function saveAll() {
    setLoading(true);
    setMsg("Presenze salvate!");
    setLoading(false);
    setTimeout(() => setMsg(""), 2000);
  }

  const starters = players.filter(p => isStarter(p.id));
  const subs = players.filter(p => isInLineup(p.id) && !isStarter(p.id));
  const absent = players.filter(p => !isInLineup(p.id));

  const roleOrder = ["portiere", "difensore", "centrocampista", "attaccante"];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Presenze</h1>

      {/* Selezione partita */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
        <label className="text-xs text-gray-500 mb-2 block">Seleziona partita</label>
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={selectedMatch}
          onChange={e => setSelectedMatch(e.target.value)}
        >
          <option value="">– Seleziona partita –</option>
          {matches.map(m => (
            <option key={m.id} value={m.id}>
              VCH vs {m.away_team} · {new Date(m.match_date).toLocaleDateString("it-IT")} · {m.home_score ?? "–"}–{m.away_score ?? "–"}
            </option>
          ))}
        </select>
      </div>

      {selectedMatch && (
        <>
          {/* Titolari */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-brand-blue text-lg">
                👕 Titolari ({starters.length}/11)
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {players
                .sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role))
                .map(p => (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition ${isStarter(p.id) ? "border-brand-blue bg-brand-blue/5" : "border-gray-100"}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-brand-red w-6">
                        {p.shirt_number ? `#${p.shirt_number}` : "–"}
                      </span>
                      <div>
                        <span className="font-semibold text-sm text-brand-blue">{p.full_name}</span>
                        <span className="text-xs text-gray-400 ml-2 capitalize">{p.role}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePlayer(p.id, true)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition ${isStarter(p.id) ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-blue hover:text-white"}`}
                      >
                        {isStarter(p.id) ? "✓ Titolare" : "Titolare"}
                      </button>
                      <button
                        onClick={() => togglePlayer(p.id, false)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition ${isInLineup(p.id) && !isStarter(p.id) ? "bg-gray-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-500 hover:text-white"}`}
                      >
                        {isInLineup(p.id) && !isStarter(p.id) ? "✓ Riserva" : "Riserva"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Riepilogo */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-extrabold text-brand-blue">{starters.length}</div>
              <div className="text-xs text-gray-500">Titolari</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-gray-500">{subs.length}</div>
              <div className="text-xs text-gray-500">Riserve</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-gray-300">{absent.length}</div>
              <div className="text-xs text-gray-500">Assenti</div>
            </div>
          </div>

          {msg && <p className="text-sm text-green-600 text-center mb-4">{msg}</p>}
        </>
      )}
    </div>
  );
}
