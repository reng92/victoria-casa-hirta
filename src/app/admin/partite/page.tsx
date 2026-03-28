"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Competition { id: string; name: string; }
interface Venue { id: string; name: string; }
interface Player { id: string; full_name: string; }
interface Match {
  id: string;
  match_date: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  live_minute: number | null;
  live_started_at: string | null;
  status: string;
  opponent_logo_url: string | null;
  competition: { name: string } | null;
}

const emptyForm = {
  away_team: "",
  match_date: "",
  match_time: "",
  is_home: true,
  competition_id: "",
  venue_id: "",
  matchday: "",
  status: "scheduled",
  home_score: "",
  away_score: "",
  opponent_logo_url: "",
};

export default function AdminPartite() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [liveHome, setLiveHome] = useState("");
  const [liveAway, setLiveAway] = useState("");
  const [livePlayer, setLivePlayer] = useState("");
  const [liveMinute, setLiveMinute] = useState("");
  const [liveEventType, setLiveEventType] = useState("gol");
  const [liveForTeam, setLiveForTeam] = useState<"vch" | "opponent">("vch");
  const [liveMsg, setLiveMsg] = useState("");
  const [liveMinuteDisplay, setLiveMinuteDisplay] = useState("");
  const [liveStartTime, setLiveStartTime] = useState("");
  const [opponentLogoUploading, setOpponentLogoUploading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [{ data: m }, { data: c }, { data: v }, { data: p }] = await Promise.all([
      supabase.from("matches").select("id, match_date, away_team, is_home, home_score, away_score, live_minute, live_started_at, status, opponent_logo_url, competition:competitions(name)").order("match_date", { ascending: false }),
      supabase.from("competitions").select("id, name"),
      supabase.from("venues").select("id, name"),
      supabase.from("players").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);
    setMatches((m as unknown as Match[]) ?? []);
    setCompetitions((c as unknown as Competition[]) ?? []);
    setVenues((v as unknown as Venue[]) ?? []);
    setPlayers((p as unknown as Player[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const match_date = `${form.match_date}T${form.match_time || "00:00"}:00`;
    const { error } = await supabase.from("matches").insert({
      away_team: form.away_team,
      match_date,
      is_home: form.is_home,
      competition_id: form.competition_id || null,
      venue_id: form.venue_id || null,
      matchday: form.matchday ? parseInt(form.matchday) : null,
      status: form.status,
      home_score: form.home_score !== "" ? parseInt(form.home_score) : null,
      away_score: form.away_score !== "" ? parseInt(form.away_score) : null,
      opponent_logo_url: form.opponent_logo_url || null,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Partita salvata!"); setForm(emptyForm); fetchAll(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa partita?")) return;
    await supabase.from("matches").delete().eq("id", id);
    fetchAll();
  }

  async function setLive(match: Match) {
    setLiveMatchId(match.id);
    setLiveHome(String(match.home_score ?? 0));
    setLiveAway(String(match.away_score ?? 0));
    setLiveMinuteDisplay(String(match.live_minute ?? 0));
    const matchTime = new Date(match.match_date).toTimeString().slice(0, 5);
    setLiveStartTime(matchTime);
    setLiveMsg("");
    await supabase.from("matches").update({
      status: "live",
      live_started_at: new Date().toISOString(),
    }).eq("id", match.id);
    fetchAll();
  }

  async function updateLiveScore() {
    if (!liveMatchId) return;
    await supabase.from("matches").update({
      home_score: parseInt(liveHome) || 0,
      away_score: parseInt(liveAway) || 0,
      status: "live",
    }).eq("id", liveMatchId);
    setLiveMsg("Punteggio aggiornato!");
    fetchAll();
  }

  async function addLiveEvent() {
    if (!liveMatchId || !livePlayer) return;
    const { error } = await supabase.from("match_events").insert({
      match_id: liveMatchId,
      player_id: livePlayer,
      event_type: liveEventType,
      minute: liveMinute ? parseInt(liveMinute) : null,
      for_team: liveForTeam,
    });
    if (!error) {
      if (liveForTeam === "vch" && liveEventType === "gol") {
        setLiveHome(String(parseInt(liveHome) + 1));
        await supabase.from("matches").update({
          home_score: parseInt(liveHome) + 1,
          status: "live",
        }).eq("id", liveMatchId);
      }
      if (liveForTeam === "opponent" && liveEventType === "gol") {
        setLiveAway(String(parseInt(liveAway) + 1));
        await supabase.from("matches").update({
          away_score: parseInt(liveAway) + 1,
          status: "live",
        }).eq("id", liveMatchId);
      }
      setLiveMsg("Evento aggiunto!");
      setLivePlayer("");
      setLiveMinute("");
      fetchAll();
    }
  }

  async function updateLiveMinute() {
    if (!liveMatchId) return;
    await supabase.from("matches").update({
      live_minute: parseInt(liveMinuteDisplay) || 0,
      live_minute_set_at: new Date().toISOString(),
    }).eq("id", liveMatchId);
    setLiveMsg("Minuto aggiornato! Il timer riparte da " + liveMinuteDisplay + "'");
    fetchAll();
  }

  async function stopTimer() {
    if (!liveMatchId) return;
    await supabase.from("matches").update({
      live_minute: parseInt(liveMinuteDisplay) || 0,
      live_minute_set_at: null,
    }).eq("id", liveMatchId);
    setLiveMsg("Timer fermato a " + liveMinuteDisplay + "'");
  }

  async function updateStartTime() {
    if (!liveMatchId || !liveStartTime) return;
    const today = new Date().toISOString().split("T")[0];
    const newDatetime = `${today}T${liveStartTime}:00`;
    await supabase.from("matches").update({
      match_date: newDatetime,
      live_started_at: newDatetime,
    }).eq("id", liveMatchId);
    setLiveMsg("Orario aggiornato!");
    fetchAll();
  }

  async function endMatch() {
    if (!liveMatchId) return;
    await supabase.from("matches").update({ status: "finished" }).eq("id", liveMatchId);
    setLiveMatchId(null);
    setLiveMsg("");
    fetchAll();
  }

  const liveMatch = matches.find(m => m.id === liveMatchId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Partite</h1>

      {/* PANNELLO LIVESCORE ATTIVO */}
      {liveMatchId && liveMatch && (
        <div className="bg-brand-blue text-white rounded-2xl p-6 mb-10 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-brand-red animate-pulse inline-block" />
            <span className="font-bold text-lg">LIVE – VCH vs {liveMatch.away_team}</span>
          </div>

          {/* Punteggio */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">VCH</div>
              <input
                type="number"
                min="0"
                className="w-16 text-center text-3xl font-extrabold bg-white/10 border border-white/20 rounded-xl py-2 text-white"
                value={liveHome}
                onChange={e => setLiveHome(e.target.value)}
              />
            </div>
            <div className="text-3xl font-extrabold text-white/40">–</div>
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">{liveMatch.away_team}</div>
              <input
                type="number"
                min="0"
                className="w-16 text-center text-3xl font-extrabold bg-white/10 border border-white/20 rounded-xl py-2 text-white"
                value={liveAway}
                onChange={e => setLiveAway(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={updateLiveScore}
            className="w-full bg-white text-brand-blue font-bold py-2 rounded-full mb-4 hover:opacity-90"
          >
            Aggiorna punteggio
          </button>

          {/* Timer manuale */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold mb-3">⏱️ Minuto di gioco</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="120"
                className="w-24 text-center text-2xl font-extrabold bg-white/10 border border-white/20 rounded-xl py-2 text-white"
                value={liveMinuteDisplay}
                onChange={e => setLiveMinuteDisplay(e.target.value)}
                placeholder="0"
              />
              <span className="text-white/60 text-sm">'</span>
              <div className="flex flex-col gap-1 flex-1">
                <button
                  onClick={updateLiveMinute}
                  className="bg-white text-brand-blue text-xs font-bold px-4 py-1.5 rounded-full hover:opacity-90"
                >
                  Aggiorna minuto
                </button>
                <button
                  onClick={stopTimer}
                  className="bg-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-white/30"
                >
                  ⏸ Ferma timer
                </button>
              </div>
            </div>
            <p className="text-xs text-white/40 mt-2">Inserisci il minuto attuale e aggiorna manualmente quando vuoi</p>
          </div>

          {/* Orario di inizio */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold mb-3">🕐 Orario effettivo inizio</div>
            <div className="flex items-center gap-3">
              <input
                type="time"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white"
                value={liveStartTime}
                onChange={e => setLiveStartTime(e.target.value)}
              />
              <button
                onClick={updateStartTime}
                className="bg-white text-brand-blue text-xs font-bold px-4 py-2 rounded-full hover:opacity-90"
              >
                Aggiorna orario
              </button>
            </div>
            <p className="text-xs text-white/40 mt-2">Modifica l'orario reale di inizio partita</p>
          </div>

          {/* Aggiungi evento */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold mb-3">Aggiungi evento</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white col-span-2"
                value={livePlayer}
                onChange={e => setLivePlayer(e.target.value)}
              >
                <option value="">– Seleziona giocatore –</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              <div className="col-span-2">
                <label className="text-xs text-white/60 mb-1 block">Squadra</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLiveForTeam("vch")}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition ${liveForTeam === "vch" ? "bg-white text-brand-blue" : "bg-white/10 text-white"}`}
                  >
                    ⚽ VCH
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveForTeam("opponent")}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition ${liveForTeam === "opponent" ? "bg-white text-brand-blue" : "bg-white/10 text-white"}`}
                  >
                    ⚽ {liveMatch?.away_team ?? "Avversario"}
                  </button>
                </div>
              </div>
              <select
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white"
                value={liveEventType}
                onChange={e => setLiveEventType(e.target.value)}
              >
                <option value="gol">⚽ Gol</option>
                <option value="assist">🎯 Assist</option>
                <option value="autorete">🙈 Autorete</option>
                <option value="ammonizione">🟨 Ammonizione</option>
                <option value="espulsione">🟥 Espulsione</option>
              </select>
              <input
                type="number"
                min="1"
                max="120"
                placeholder="Minuto"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40"
                value={liveMinute}
                onChange={e => setLiveMinute(e.target.value)}
              />
            </div>
            <button
              onClick={addLiveEvent}
              disabled={!livePlayer}
              className="w-full bg-brand-red text-white font-semibold py-2 rounded-full hover:opacity-90 disabled:opacity-40"
            >
              Aggiungi evento
            </button>
          </div>

          {liveMsg && <p className="text-xs text-green-300 text-center mb-3">{liveMsg}</p>}

          <button
            onClick={endMatch}
            className="w-full bg-red-800 text-white font-bold py-2 rounded-full hover:opacity-90"
          >
            ✅ Fine partita
          </button>
        </div>
      )}

      {/* FORM NUOVA PARTITA */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi partita</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Avversario *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.away_team} onChange={e => setForm(f => ({ ...f, away_team: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data *</label>
            <input required type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.match_date} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Orario</label>
            <input type="time" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.match_time} onChange={e => setForm(f => ({ ...f, match_time: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Casa / Trasferta</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.is_home ? "1" : "0"} onChange={e => setForm(f => ({ ...f, is_home: e.target.value === "1" }))}>
              <option value="1">Casa</option>
              <option value="0">Trasferta</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Competizione</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.competition_id} onChange={e => setForm(f => ({ ...f, competition_id: e.target.value }))}>
              <option value="">– Seleziona –</option>
              {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Campo</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.venue_id} onChange={e => setForm(f => ({ ...f, venue_id: e.target.value }))}>
              <option value="">– Seleziona –</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Giornata</label>
            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.matchday} onChange={e => setForm(f => ({ ...f, matchday: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Stato</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="scheduled">Programmata</option>
              <option value="live">In corso</option>
              <option value="finished">Terminata</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Logo avversario</label>
            <div className="flex items-center gap-3">
              {form.opponent_logo_url && (
                <img src={form.opponent_logo_url} alt="logo" className="w-12 h-12 rounded-full object-contain border border-gray-200" />
              )}
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-full transition">
                {opponentLogoUploading ? "Caricamento..." : "Carica logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={opponentLogoUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setOpponentLogoUploading(true);
                    const { uploadImage } = await import("@/lib/storage");
                    const url = await uploadImage(file, "opponents");
                    if (url) setForm(f => ({ ...f, opponent_logo_url: url }));
                    setOpponentLogoUploading(false);
                  }}
                />
              </label>
              <span className="text-xs text-gray-400">oppure</span>
              <input
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.opponent_logo_url}
                onChange={e => setForm(f => ({ ...f, opponent_logo_url: e.target.value }))}
                placeholder="URL immagine..."
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Salva partita"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      {/* LISTA PARTITE */}
      <div className="flex flex-col gap-3">
        {matches.map((m) => (
          <div key={m.id} className={`bg-white border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${m.status === "live" ? "border-brand-red" : "border-gray-100"}`}>
            <div>
              {m.status === "live" && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse inline-block" />
                  <span className="text-xs font-bold text-brand-red">LIVE</span>
                </div>
              )}
              <div className="font-semibold text-brand-blue text-sm flex items-center gap-2">
                {m.opponent_logo_url && (
                  <img src={m.opponent_logo_url} alt={m.away_team} className="w-6 h-6 object-contain rounded" />
                )}
                VCH vs {m.away_team} · {m.is_home ? "Casa" : "Trasferta"}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(m.match_date).toLocaleDateString("it-IT")} · {m.competition?.name ?? "–"} · {m.status}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {m.status === "scheduled" && (
                <button onClick={() => setLive(m)} className="text-xs bg-brand-red text-white px-3 py-1 rounded-full hover:opacity-90">
                  🔴 Inizia live
                </button>
              )}
              {m.status === "live" && (
                <button onClick={() => setLive(m)} className="text-xs bg-brand-red text-white px-3 py-1 rounded-full hover:opacity-90 animate-pulse">
                  🔴 Gestisci live
                </button>
              )}
              {m.status === "finished" && (
                <span className="text-sm font-bold text-brand-red">{m.home_score} – {m.away_score}</span>
              )}
              <button onClick={() => handleDelete(m.id)} className="text-xs text-gray-400 hover:text-red-500 transition">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
