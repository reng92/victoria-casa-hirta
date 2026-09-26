"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Player { id: string; full_name: string; }
interface MatchEvent {
  id: string;
  event_type: string;
  minute: number | null;
  for_team: string | null;
  player: { full_name: string } | null;
  player_out: { full_name: string } | null;
}

const eventTypes: { value: string; label: string }[] = [
  { value: "gol", label: "⚽ Gol" },
  { value: "rigore_segnato", label: "⚽✅ Rigore segnato" },
  { value: "autorete", label: "🙈 Autorete" },
  { value: "assist", label: "🎯 Assist" },
  { value: "ammonizione", label: "🟨 Ammonizione" },
  { value: "espulsione", label: "🟥 Espulsione" },
  { value: "cambio", label: "🔄 Cambio" },
  { value: "rigore_parato", label: "🧤 Rigore parato" },
  { value: "rigore_sbagliato", label: "❌ Rigore sbagliato" },
];
const labelOf = (t: string) => eventTypes.find(e => e.value === t)?.label ?? t;

/**
 * Marcatori ed eventi di una partita, anche già giocata. Il minuto è facoltativo.
 * Non tocca il punteggio: per le partite finite si imposta nei campi "Gol".
 */
export default function MatchEventsEditor({ matchId, opponent, players }: { matchId: string; opponent: string; players: Player[] }) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [forTeam, setForTeam] = useState<"vch" | "opponent">("vch");
  const [type, setType] = useState("gol");
  const [player, setPlayer] = useState("");
  const [playerOut, setPlayerOut] = useState("");
  const [minute, setMinute] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchEvents(); }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchEvents() {
    const { data } = await supabase
      .from("match_events")
      .select("id, event_type, minute, for_team, player:players!match_events_player_id_fkey(full_name), player_out:players!match_events_player_out_id_fkey(full_name)")
      .eq("match_id", matchId)
      .order("minute", { ascending: true, nullsFirst: false });
    setEvents((data as unknown as MatchEvent[]) ?? []);
  }

  // Per l'avversario il giocatore non è in rosa: basta la squadra
  const needsPlayer = forTeam === "vch";

  async function add() {
    if (needsPlayer && !player) return;
    setSaving(true);
    setMsg("");
    const { error } = await supabase.from("match_events").insert({
      match_id: matchId,
      player_id: forTeam === "vch" ? player : null,
      player_out_id: forTeam === "vch" && type === "cambio" ? (playerOut || null) : null,
      event_type: type,
      minute: minute !== "" ? parseInt(minute) : null,
      for_team: forTeam,
    });
    if (error) setMsg("Errore: " + error.message);
    else {
      setMsg("✅ Evento aggiunto");
      setPlayer("");
      setPlayerOut("");
      setMinute("");
      fetchEvents();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo evento?")) return;
    await supabase.from("match_events").delete().eq("id", id);
    fetchEvents();
  }

  const field = "border border-gray-200 rounded-lg px-3 py-2 text-sm";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setForTeam("vch")} className={`flex-1 py-2 rounded-full text-xs font-bold transition ${forTeam === "vch" ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600"}`}>
          VCH
        </button>
        <button type="button" onClick={() => setForTeam("opponent")} className={`flex-1 py-2 rounded-full text-xs font-bold transition truncate px-2 ${forTeam === "opponent" ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600"}`}>
          {opponent || "Avversario"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_90px] gap-2">
        <select className={field} value={type} onChange={e => setType(e.target.value)}>
          {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {needsPlayer ? (
          <select className={field} value={player} onChange={e => setPlayer(e.target.value)}>
            <option value="">– Giocatore –</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        ) : (
          <div className={`${field} bg-gray-50 text-gray-500 truncate`}>{opponent || "Avversario"}</div>
        )}
        <input type="number" min="0" max="130" placeholder="Min. (opz.)" className={field} value={minute} onChange={e => setMinute(e.target.value)} />
      </div>

      {needsPlayer && type === "cambio" && (
        <select className={field} value={playerOut} onChange={e => setPlayerOut(e.target.value)}>
          <option value="">– Giocatore che esce –</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      )}

      <button
        type="button"
        onClick={add}
        disabled={saving || (needsPlayer && !player)}
        className="w-full bg-brand-blue text-white font-semibold py-2 rounded-full hover:opacity-90 disabled:opacity-40 text-sm"
      >
        {saving ? "Salvataggio..." : "Aggiungi evento"}
      </button>
      {msg && <p className={`text-xs ${msg.startsWith("Errore") ? "text-red-600" : "text-green-600"}`}>{msg}</p>}

      {events.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-1">
          {events.map(ev => (
            <li key={ev.id} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-gray-50 border border-gray-100">
              <span className="font-bold tabular shrink-0 w-9 text-gray-500">{ev.minute != null ? `${ev.minute}'` : "–"}</span>
              <span className="shrink-0">{labelOf(ev.event_type)}</span>
              <span className="font-semibold truncate flex-1">
                {ev.player?.full_name ?? (ev.for_team === "opponent" ? opponent : "–")}
                {ev.player_out && <span className="font-normal text-gray-400"> ↔ {ev.player_out.full_name}</span>}
              </span>
              <span className="text-gray-400 shrink-0">{ev.for_team === "opponent" ? opponent : "VCH"}</span>
              <button type="button" onClick={() => remove(ev.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition" aria-label="Elimina evento">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
