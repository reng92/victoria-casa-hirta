"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MODULES, inferModule, moduleSlots, shortName } from "@/lib/formation";

interface Match {
  id: string;
  match_date: string;
  away_team: string;
  is_home: boolean;
  status: string;
}

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
}

const roleOrder: Record<string, number> = { portiere: 0, difensore: 1, centrocampista: 2, attaccante: 3 };
const statusLabel: Record<string, string> = { scheduled: "da giocare", live: "in corso", finished: "finita" };

/** Etichetta della posizione: portiere, poi difesa / centrocampo / attacco per riga. */
function slotLabels(module: string): string[] {
  const rows = module.split("-").map(Number);
  const labels = ["Portiere"];
  rows.forEach((count, r) => {
    const name = r === 0 ? "Difensore" : r === rows.length - 1 ? "Attaccante" : "Centrocampista";
    for (let i = 0; i < count; i++) labels.push(name);
  });
  return labels;
}

export default function AdminFormazione() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMatch, setSelectedMatch] = useState("");
  const [module, setModule] = useState<string>("4-3-3");
  // Un giocatore (o "") per ogni posizione del modulo, nell'ordine di moduleSlots
  const [starters, setStarters] = useState<string[]>(Array(11).fill(""));
  const [bench, setBench] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (selectedMatch) loadLineup(selectedMatch); }, [selectedMatch]);

  async function fetchAll() {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("matches").select("id, match_date, away_team, is_home, status")
        .order("match_date", { ascending: false }).limit(30),
      supabase.from("players").select("id, full_name, shirt_number, role")
        .eq("is_active", true).order("shirt_number"),
    ]);
    setMatches((m as unknown as Match[]) ?? []);
    const list = (p as unknown as Player[]) ?? [];
    list.sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || (a.shirt_number ?? 999) - (b.shirt_number ?? 999));
    setPlayers(list);
  }

  async function loadLineup(matchId: string) {
    setMsg("");
    const [{ data: f }, { data: l }] = await Promise.all([
      supabase.from("match_formations").select("player_id, position_x, position_y").eq("match_id", matchId),
      supabase.from("match_lineups").select("player_id, is_starter").eq("match_id", matchId),
    ]);
    const saved = (f as { player_id: string; position_x: number; position_y: number }[]) ?? [];
    const lineups = (l as { player_id: string; is_starter: boolean | null }[]) ?? [];

    const found = inferModule(saved.map(s => ({ x: s.position_x, y: s.position_y })));
    const mod = found && (MODULES as readonly string[]).includes(found) ? found : "4-3-3";
    const slots = moduleSlots(mod);
    // Ogni giocatore salvato va nella posizione del modulo più vicina ancora libera
    const next = Array(slots.length).fill("");
    for (const s of saved) {
      let best = -1, bestDist = Infinity;
      slots.forEach((slot, i) => {
        const d = (slot.x - s.position_x) ** 2 + (slot.y - s.position_y) ** 2;
        if (!next[i] && d < bestDist) { best = i; bestDist = d; }
      });
      if (best >= 0) next[best] = s.player_id;
    }
    setModule(mod);
    setStarters(next);
    setBench(lineups.filter(x => x.is_starter === false).map(x => x.player_id));
    setDirty(false);
  }

  function changeModule(mod: string) {
    // I giocatori restano nell'ordine: portiere, difesa, centrocampo, attacco
    setModule(mod);
    setStarters(prev => {
      const next = Array(moduleSlots(mod).length).fill("");
      prev.forEach((id, i) => { if (i < next.length) next[i] = id; });
      return next;
    });
    setDirty(true);
  }

  function assign(index: number, playerId: string) {
    setStarters(prev => prev.map((id, i) => (i === index ? playerId : id === playerId && playerId ? "" : id)));
    if (playerId) setBench(prev => prev.filter(id => id !== playerId));
    setDirty(true);
  }

  function toggleBench(playerId: string) {
    setBench(prev => (prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]));
    setDirty(true);
  }

  async function save() {
    if (!selectedMatch) return;
    setSaving(true);
    setMsg("");
    const slots = moduleSlots(module);
    const formationRows = starters
      .map((player_id, i) => ({ match_id: selectedMatch, player_id, position_x: slots[i].x, position_y: slots[i].y }))
      .filter(r => r.player_id);
    const lineupRows = [
      ...formationRows.map(r => ({ match_id: selectedMatch, player_id: r.player_id, is_starter: true })),
      ...bench.map(player_id => ({ match_id: selectedMatch, player_id, is_starter: false })),
    ];

    // Titolari e panchina valgono anche come presenze (match_lineups)
    const del1 = await supabase.from("match_formations").delete().eq("match_id", selectedMatch);
    const del2 = await supabase.from("match_lineups").delete().eq("match_id", selectedMatch);
    const ins1 = formationRows.length ? await supabase.from("match_formations").insert(formationRows) : { error: null };
    const ins2 = lineupRows.length ? await supabase.from("match_lineups").insert(lineupRows) : { error: null };
    const error = del1.error || del2.error || ins1.error || ins2.error;
    if (error) setMsg("Errore: " + error.message);
    else {
      setMsg(formationRows.length < 11 && formationRows.length > 0
        ? `Salvata, ma i titolari sono ${formationRows.length} su 11.`
        : "Formazione salvata!");
      setDirty(false);
    }
    setSaving(false);
  }

  async function clearAll() {
    if (!selectedMatch || !confirm("Cancellare formazione e panchina di questa partita?")) return;
    await supabase.from("match_formations").delete().eq("match_id", selectedMatch);
    await supabase.from("match_lineups").delete().eq("match_id", selectedMatch);
    setStarters(Array(moduleSlots(module).length).fill(""));
    setBench([]);
    setDirty(false);
    setMsg("Formazione cancellata.");
  }

  const slots = useMemo(() => moduleSlots(module), [module]);
  const labels = useMemo(() => slotLabels(module), [module]);
  const byId = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const benchCandidates = players.filter(p => !starters.includes(p.id));
  const match = matches.find(m => m.id === selectedMatch);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Admin – Formazione</h1>
      <p className="text-sm text-gray-500 mb-8">
        Titolari in campo e panchina della Victoria. Si può inserire anche per partite già giocate:
        gol, cartellini e cambi inseriti nella partita compaiono da soli sui giocatori.
      </p>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Partita</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={selectedMatch}
              onChange={e => {
                if (dirty && !confirm("Ci sono modifiche non salvate. Cambiare partita?")) return;
                setSelectedMatch(e.target.value);
              }}
            >
              <option value="">– Seleziona partita –</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  {m.is_home ? `VCH vs ${m.away_team}` : `${m.away_team} vs VCH`} · {new Date(m.match_date).toLocaleDateString("it-IT")} · {statusLabel[m.status] ?? m.status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Modulo</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={module}
              onChange={e => changeModule(e.target.value)}
              disabled={!selectedMatch}
            >
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedMatch && (
        <>
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 mb-6">
            {/* Anteprima campo */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <div
                className="relative w-full rounded-xl overflow-hidden"
                style={{ aspectRatio: "3 / 4", background: "repeating-linear-gradient(180deg, #2e8b57 0 12.5%, #2a8150 12.5% 25%)" }}
              >
                <div className="absolute inset-3 border-2 border-white/35 rounded-sm" />
                <div className="absolute left-3 right-3 border-t-2 border-white/35" style={{ top: "50%" }} />
                {slots.map((s, i) => {
                  const p = byId.get(starters[i]);
                  return (
                    <div key={i} className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-extrabold shadow ${
                        p ? (i === 0 ? "bg-yellow-400 border-yellow-200 text-gray-900" : "bg-brand-blue border-white text-white") : "bg-white/20 border-dashed border-white/70 text-white"
                      }`}>
                        {p ? p.shirt_number ?? "·" : i + 1}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold text-white whitespace-nowrap max-w-[70px] truncate [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
                        {p ? shortName(p.full_name) : labels[i]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Titolari */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <h2 className="font-bold text-brand-blue mb-3">Titolari <span className="text-gray-400 font-normal text-sm">({starters.filter(Boolean).length}/11)</span></h2>
              <div className="flex flex-col gap-2">
                {slots.map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${starters[i] ? "bg-brand-blue" : "bg-gray-300"}`}>{i + 1}</span>
                    <span className="w-24 text-[11px] text-gray-500 shrink-0">{labels[i]}</span>
                    <select
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                      value={starters[i] ?? ""}
                      onChange={e => assign(i, e.target.value)}
                    >
                      <option value="">– vuoto –</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.shirt_number != null ? `${p.shirt_number} · ` : ""}{p.full_name} ({p.role}){starters.includes(p.id) && starters[i] !== p.id ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panchina */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="font-bold text-brand-blue mb-1">Panchina <span className="text-gray-400 font-normal text-sm">({bench.length})</span></h2>
            <p className="text-xs text-gray-500 mb-4">Tocca i giocatori convocati in panchina.</p>
            <div className="flex flex-wrap gap-2">
              {benchCandidates.map(p => {
                const on = bench.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleBench(p.id)}
                    aria-pressed={on}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold transition border ${on ? "bg-brand-blue text-white border-brand-blue" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-blue"}`}
                  >
                    {p.shirt_number != null ? `${p.shirt_number} · ` : ""}{p.full_name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button onClick={save} disabled={saving} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {saving ? "Salvataggio..." : "Salva formazione"}
            </button>
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️ Cancella formazione</button>
            {dirty && !msg && <span className="text-xs text-amber-600">Modifiche non salvate</span>}
            {msg && <span className={`text-sm ${msg.startsWith("Errore") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
            {match && (
              <a href={`/calendario/${match.id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-blue hover:underline ml-auto">
                Vedi la pagina partita ↗
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
