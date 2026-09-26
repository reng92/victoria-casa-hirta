"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface Match {
  id: string;
  match_date: string;
  away_team: string;
  status: string;
}

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  photo_url: string | null;
}

interface FormationPlayer {
  id: string;
  player_id: string;
  position_x: number;
  position_y: number;
  player: { full_name: string; shirt_number: number | null } | null;
}

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }[]> = {
  "4-3-3": [
    { x: 50, y: 88 },
    { x: 20, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 80, y: 72 },
    { x: 25, y: 52 }, { x: 50, y: 52 }, { x: 75, y: 52 },
    { x: 20, y: 28 }, { x: 50, y: 22 }, { x: 80, y: 28 },
  ],
  "4-4-2": [
    { x: 50, y: 88 },
    { x: 20, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 80, y: 72 },
    { x: 20, y: 52 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 80, y: 52 },
    { x: 35, y: 25 }, { x: 65, y: 25 },
  ],
  "3-5-2": [
    { x: 50, y: 88 },
    { x: 25, y: 72 }, { x: 50, y: 72 }, { x: 75, y: 72 },
    { x: 15, y: 52 }, { x: 32, y: 52 }, { x: 50, y: 52 }, { x: 68, y: 52 }, { x: 85, y: 52 },
    { x: 35, y: 25 }, { x: 65, y: 25 },
  ],
  "4-2-3-1": [
    { x: 50, y: 88 },
    { x: 20, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 80, y: 72 },
    { x: 35, y: 58 }, { x: 65, y: 58 },
    { x: 20, y: 38 }, { x: 50, y: 35 }, { x: 80, y: 38 },
    { x: 50, y: 18 },
  ],
};

export default function AdminFormazione() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMatch, setSelectedMatch] = useState("");
  const [formation, setFormation] = useState<FormationPlayer[]>([]);
  const [selectedModule, setSelectedModule] = useState("4-3-3");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (selectedMatch) fetchFormation(selectedMatch); }, [selectedMatch]);

  async function fetchAll() {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("matches").select("id, match_date, away_team, status")
        .order("match_date", { ascending: false }).limit(20),
      supabase.from("players").select("id, full_name, shirt_number, role, photo_url")
        .eq("is_active", true).order("shirt_number"),
    ]);
    setMatches((m as unknown as Match[]) ?? []);
    setPlayers((p as unknown as Player[]) ?? []);
  }

  async function fetchFormation(matchId: string) {
    const { data } = await supabase
      .from("match_formations")
      .select("id, player_id, position_x, position_y, player:players(full_name, shirt_number)")
      .eq("match_id", matchId);
    setFormation((data as unknown as FormationPlayer[]) ?? []);
  }

  async function applyModule() {
    if (!selectedMatch) return;
    const positions = DEFAULT_POSITIONS[selectedModule];
    if (!positions) return;
    await supabase.from("match_formations").delete().eq("match_id", selectedMatch);
    setFormation([]);
    setMsg("Schema applicato! Ora assegna i giocatori.");
    const emptyFormation: FormationPlayer[] = positions.map((pos, i) => ({
      id: `temp-${i}`,
      player_id: "",
      position_x: pos.x,
      position_y: pos.y,
      player: null,
    }));
    setFormation(emptyFormation);
  }

  async function assignPlayer(index: number, playerId: string) {
    if (!selectedMatch) return;
    const pos = formation[index];
    if (!pos) return;

    if (pos.id.startsWith("temp-")) {
      const { data, error } = await supabase.from("match_formations").insert({
        match_id: selectedMatch,
        player_id: playerId,
        position_x: pos.position_x,
        position_y: pos.position_y,
      }).select("id").single();
      if (!error && data) {
        const player = players.find(p => p.id === playerId);
        const updated = [...formation];
        updated[index] = {
          ...pos,
          id: data.id,
          player_id: playerId,
          player: player ? { full_name: player.full_name, shirt_number: player.shirt_number } : null,
        };
        setFormation(updated);
      }
    } else {
      await supabase.from("match_formations").update({
        player_id: playerId,
      }).eq("id", pos.id);
      const player = players.find(p => p.id === playerId);
      const updated = [...formation];
      updated[index] = {
        ...pos,
        player_id: playerId,
        player: player ? { full_name: player.full_name, shirt_number: player.shirt_number } : null,
      };
      setFormation(updated);
    }
  }

  async function clearFormation() {
    if (!selectedMatch || !confirm("Cancellare la formazione?")) return;
    await supabase.from("match_formations").delete().eq("match_id", selectedMatch);
    setFormation([]);
    setMsg("Formazione cancellata.");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Formazione</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Partita</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}>
              <option value="">– Seleziona partita –</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  VCH vs {m.away_team} · {new Date(m.match_date).toLocaleDateString("it-IT")} · {m.status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Schema tattico</label>
            <div className="flex gap-2">
              <select className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selectedModule} onChange={e => setSelectedModule(e.target.value)}>
                <option value="4-3-3">4-3-3</option>
                <option value="4-4-2">4-4-2</option>
                <option value="3-5-2">3-5-2</option>
                <option value="4-2-3-1">4-2-3-1</option>
              </select>
              <button onClick={applyModule} disabled={!selectedMatch} className="bg-brand-blue text-white text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50">
                Applica
              </button>
            </div>
          </div>
        </div>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </div>

      {selectedMatch && formation.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-bold text-brand-blue text-lg mb-4">Assegna giocatori alle posizioni</h2>

          {/* Campo visivo */}
          <div className="relative w-full rounded-xl overflow-hidden mb-6"
            style={{ background: "linear-gradient(180deg, #2d8a4e 0%, #2d8a4e 100%)", paddingBottom: "150%" }}>
            <div className="absolute inset-0">
              <div className="absolute inset-3 border-2 border-white/40 rounded" />
              <div className="absolute left-3 right-3 border-t-2 border-white/40" style={{ top: "50%" }} />
              <div className="absolute border-2 border-white/40 rounded-full w-16 h-16" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
              <div className="absolute border-2 border-white/40" style={{ top: "3%", left: "35%", right: "35%", height: "8%" }} />
              <div className="absolute border-2 border-white/40" style={{ top: "3%", left: "20%", right: "20%", height: "18%" }} />
              <div className="absolute border-2 border-white/40" style={{ bottom: "3%", left: "35%", right: "35%", height: "8%" }} />
              <div className="absolute border-2 border-white/40" style={{ bottom: "3%", left: "20%", right: "20%", height: "18%" }} />
            </div>
            {formation.map((fp, i) => (
              <div key={i} className="absolute flex flex-col items-center"
                style={{ left: `${fp.position_x}%`, top: `${fp.position_y}%`, transform: "translate(-50%, -50%)" }}>
                <div className={`w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-extrabold ${fp.player_id ? "bg-brand-blue" : "bg-gray-400"}`}>
                  {fp.player?.shirt_number ?? (i + 1)}
                </div>
                <div className="mt-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-20 truncate text-center">
                  {fp.player?.full_name?.split(" ").pop() ?? `Pos ${i + 1}`}
                </div>
              </div>
            ))}
          </div>

          {/* Lista posizioni */}
          <div className="flex flex-col gap-2">
            {formation.map((fp, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${fp.player_id ? "bg-brand-blue" : "bg-gray-300"}`}>
                  {i + 1}
                </div>
                <select
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={fp.player_id}
                  onChange={e => assignPlayer(i, e.target.value)}
                >
                  <option value="">– Seleziona giocatore –</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.shirt_number ? `#${p.shirt_number} ` : ""}{p.full_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button onClick={clearFormation} className="mt-4 text-xs text-gray-400 hover:text-red-500 transition">
            🗑️ Cancella formazione
          </button>
        </div>
      )}
    </div>
  );
}
