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
}

interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  event_type: string;
  minute: number | null;
  player: { full_name: string } | null;
}

const emptyForm = {
  match_id: "",
  player_id: "",
  event_type: "gol",
  minute: "",
};

export default function AdminMarcatori() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (form.match_id) fetchEvents(form.match_id);
    else setEvents([]);
  }, [form.match_id]);

  async function fetchAll() {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase
        .from("matches")
        .select("id, match_date, away_team, is_home, home_score, away_score, status")
        .in("status", ["live", "finished"])
        .order("match_date", { ascending: false }),
      supabase
        .from("players")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name"),
    ]);
    setMatches((m as Match[]) ?? []);
    setPlayers((p as Player[]) ?? []);
  }

  async function fetchEvents(matchId: string) {
    const { data } = await supabase
      .from("match_events")
      .select("id, match_id, player_id, event_type, minute, player:players(full_name)")
      .eq("match_id", matchId)
      .order("minute", { ascending: true });
    setEvents((data as MatchEvent[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("match_events").insert({
      match_id: form.match_id,
      player_id: form.player_id,
      event_type: form.event_type,
      minute: form.minute ? parseInt(form.minute) : null,
    });
    if (error) setMsg("Errore: " + error.message);
    else {
      setMsg("Evento salvato!");
      setForm(f => ({ ...f, player_id: "", minute: "", event_type: "gol" }));
      fetchEvents(form.match_id);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo evento?")) return;
    await supabase.from("match_events").delete().eq("id", id);
    if (form.match_id) fetchEvents(form.match_id);
  }

  const eventEmoji: Record<string, string> = {
    gol: "⚽",
    autorete: "🙈",
    assist: "🎯",
    ammonizione: "🟨",
    espulsione: "🟥",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Marcatori & Eventi</h1>

      {/* Form inserimento evento */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi evento partita</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Partita *</label>
            <select
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.match_id}
              onChange={e => setForm(f => ({ ...f, match_id: e.target.value }))}
            >
              <option value="">– Seleziona partita –</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  VCH vs {m.away_team} · {new Date(m.match_date).toLocaleDateString("it-IT")} · {m.home_score ?? "–"}–{m.away_score ?? "–"} · {m.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Giocatore *</label>
            <select
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.player_id}
              onChange={e => setForm(f => ({ ...f, player_id: e.target.value }))}
            >
              <option value="">– Seleziona giocatore –</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tipo evento *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.event_type}
              onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
            >
              <option value="gol">⚽ Gol</option>
              <option value="autorete">🙈 Autorete</option>
              <option value="assist">🎯 Assist</option>
              <option value="ammonizione">🟨 Ammonizione</option>
              <option value="espulsione">🟥 Espulsione</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Minuto</label>
            <input
              type="number"
              min="1"
              max="120"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.minute}
              onChange={e => setForm(f => ({ ...f, minute: e.target.value }))}
              placeholder="es. 45"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Salvataggio..." : "Aggiungi evento"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      {/* Lista eventi partita selezionata */}
      {form.match_id && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-lg text-brand-blue mb-4">
            Eventi partita selezionata
          </h2>

          {events.length === 0 && (
            <p className="text-gray-400 text-sm">Nessun evento inserito per questa partita.</p>
          )}

          <div className="flex flex-col gap-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between border-b border-gray-50 py-2"
              >
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-xl">{eventEmoji[ev.event_type] ?? "📋"}</span>
                  <div>
                    <span className="font-semibold text-brand-blue">
                      {ev.player?.full_name ?? "–"}
                    </span>
                    <span className="text-gray-400 ml-2 capitalize">{ev.event_type}</span>
                    {ev.minute && (
                      <span className="text-gray-400 ml-2">{ev.minute}'</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
