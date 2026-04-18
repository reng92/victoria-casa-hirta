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
  status: string;
  opponent_logo_url: string | null;
  instagram_reels: string[] | null;
  live_minute: number | null;
  live_minute_set_at: string | null;
  live_period: string | null;
  live_extra_time: number | null;
  competition: { name: string } | null;
}
interface MatchEvent {
  id: string;
  event_type: string;
  minute: number | null;
  for_team: string | null;
  player: { full_name: string } | null;
  player_out: { full_name: string } | null;
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
  const [opponentLogoUploading, setOpponentLogoUploading] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [editForm, setEditForm] = useState({
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
  });
  const [editReels, setEditReels] = useState<string[]>([]);
  const [editNewReel, setEditNewReel] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  // Live state
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [liveHome, setLiveHome] = useState("0");
  const [liveAway, setLiveAway] = useState("0");
  const [livePlayer, setLivePlayer] = useState("");
  const [livePlayerOut, setLivePlayerOut] = useState("");
  const [liveMinute, setLiveMinute] = useState("");
  const [liveEventType, setLiveEventType] = useState("gol");
  const [liveForTeam, setLiveForTeam] = useState<"vch" | "opponent">("vch");
  const [liveMsg, setLiveMsg] = useState("");
  const [liveMinuteDisplay, setLiveMinuteDisplay] = useState("");
  const [liveStartTime, setLiveStartTime] = useState("");
  const [liveExtraTime, setLiveExtraTime] = useState("0");
  const [liveOpponentLogo, setLiveOpponentLogo] = useState("");
  const [liveOpponentLogoUploading, setLiveOpponentLogoUploading] = useState(false);
  const [liveEvents, setLiveEvents] = useState<MatchEvent[]>([]);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (liveMatchId) fetchLiveEvents(liveMatchId);
  }, [liveMatchId]);

  async function fetchAll() {
    const [{ data: m }, { data: c }, { data: v }, { data: p }] = await Promise.all([
      supabase.from("matches").select("id, match_date, away_team, is_home, home_score, away_score, status, opponent_logo_url, instagram_reels, live_minute, live_minute_set_at, live_period, live_extra_time, competition:competitions(name)").order("match_date", { ascending: false }),
      supabase.from("competitions").select("id, name"),
      supabase.from("venues").select("id, name"),
      supabase.from("players").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);
    setMatches((m as unknown as Match[]) ?? []);
    setCompetitions((c as unknown as Competition[]) ?? []);
    setVenues((v as unknown as Venue[]) ?? []);
    setPlayers((p as unknown as Player[]) ?? []);
  }

  async function fetchLiveEvents(matchId: string) {
    const { data } = await supabase
      .from("match_events")
      .select("id, event_type, minute, for_team, player:players!match_events_player_id_fkey(full_name), player_out:players!match_events_player_out_id_fkey(full_name)")
      .eq("match_id", matchId)
      .order("minute", { ascending: true });
    setLiveEvents((data as unknown as MatchEvent[]) ?? []);
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

  function openEdit(m: Match) {
    setEditMatch(m);
    const d = new Date(m.match_date);
    setEditForm({
      away_team: m.away_team,
      match_date: d.toISOString().split("T")[0],
      match_time: d.toTimeString().slice(0, 5),
      is_home: m.is_home,
      competition_id: "",
      venue_id: "",
      matchday: "",
      status: m.status,
      home_score: m.home_score !== null ? String(m.home_score) : "",
      away_score: m.away_score !== null ? String(m.away_score) : "",
      opponent_logo_url: m.opponent_logo_url ?? "",
    });
    setEditReels(m.instagram_reels ?? []);
    setEditNewReel("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMatch) return;
    setEditLoading(true);
    setEditMsg("");
    const match_date = `${editForm.match_date}T${editForm.match_time || "00:00"}:00`;
    const { error } = await supabase.from("matches").update({
      away_team: editForm.away_team,
      match_date,
      is_home: editForm.is_home,
      status: editForm.status,
      home_score: editForm.home_score !== "" ? parseInt(editForm.home_score) : null,
      away_score: editForm.away_score !== "" ? parseInt(editForm.away_score) : null,
      opponent_logo_url: editForm.opponent_logo_url || null,
      instagram_reels: editReels.length > 0 ? editReels : null,
    }).eq("id", editMatch.id);
    if (error) setEditMsg("Errore: " + error.message);
    else { setEditMsg("Partita aggiornata!"); fetchAll(); setTimeout(() => setEditMatch(null), 1000); }
    setEditLoading(false);
  }

  async function startLive(match: Match) {
    setLiveMatchId(match.id);
    setLiveHome(String(match.home_score ?? 0));
    setLiveAway(String(match.away_score ?? 0));
    setLiveMinuteDisplay(String(match.live_minute ?? 0));
    setLiveExtraTime(String(match.live_extra_time ?? 0));
    const matchTime = new Date(match.match_date).toTimeString().slice(0, 5);
    setLiveStartTime(matchTime);
    setLiveOpponentLogo(match.opponent_logo_url ?? "");
    setLiveMsg("");
    await supabase.from("matches").update({
      status: "live",
      live_period: match.live_period ?? "first_half",
      live_started_at: new Date().toISOString(),
    }).eq("id", match.id);
    fetchAll();
    fetchLiveEvents(match.id);
  }

  async function setPeriod(period: string, minuteStart: number) {
    if (!liveMatchId) return;
    await supabase.from("matches").update({
      live_period: period,
      live_minute: minuteStart,
      live_minute_set_at: new Date().toISOString(),
      live_extra_time: 0,
    }).eq("id", liveMatchId);
    setLiveMinuteDisplay(String(minuteStart));
    setLiveExtraTime("0");
    setLiveMsg(period === "half_time" ? "⏸ Intervallo!" : period === "second_half" ? "▶️ Secondo tempo iniziato!" : period === "extra_time" ? "⚡ Tempi supplementari!" : "");
    fetchAll();
  }

  async function updateLiveScore() {
    if (!liveMatchId) return;
    await supabase.from("matches").update({
      home_score: parseInt(liveHome) || 0,
      away_score: parseInt(liveAway) || 0,
    }).eq("id", liveMatchId);
    setLiveMsg("✅ Punteggio aggiornato!");
    fetchAll();
  }

  async function updateLiveMinute() {
    if (!liveMatchId) return;
    await supabase.from("matches").update({
      live_minute: parseInt(liveMinuteDisplay) || 0,
      live_minute_set_at: new Date().toISOString(),
      live_extra_time: parseInt(liveExtraTime) || 0,
    }).eq("id", liveMatchId);
    setLiveMsg(`⏱️ Timer riparte da ${liveMinuteDisplay}'${parseInt(liveExtraTime) > 0 ? `+${liveExtraTime}` : ""}`);
    fetchAll();
  }

  async function stopTimer() {
    if (!liveMatchId) return;
    await supabase.from("matches").update({
      live_minute: parseInt(liveMinuteDisplay) || 0,
      live_minute_set_at: null,
    }).eq("id", liveMatchId);
    setLiveMsg("⏸ Timer fermato");
  }

  async function updateStartTime() {
    if (!liveMatchId || !liveStartTime) return;
    const today = new Date().toISOString().split("T")[0];
    const newDatetime = `${today}T${liveStartTime}:00`;
    await supabase.from("matches").update({
      match_date: newDatetime,
      live_started_at: newDatetime,
    }).eq("id", liveMatchId);
    setLiveMsg("🕐 Orario aggiornato!");
    fetchAll();
  }

  async function addLiveEvent() {
    if (!liveMatchId || !livePlayer) return;
    const { error } = await supabase.from("match_events").insert({
      match_id: liveMatchId,
      player_id: livePlayer,
      player_out_id: liveEventType === "cambio" ? (livePlayerOut || null) : null,
      event_type: liveEventType,
      minute: liveMinute ? parseInt(liveMinute) : null,
      for_team: liveForTeam,
    });
    if (!error) {
      if (liveEventType === "gol") {
        const newHome = liveForTeam === "vch" ? parseInt(liveHome) + 1 : parseInt(liveHome);
        const newAway = liveForTeam === "opponent" ? parseInt(liveAway) + 1 : parseInt(liveAway);
        setLiveHome(String(newHome));
        setLiveAway(String(newAway));
        await supabase.from("matches").update({
          home_score: newHome,
          away_score: newAway,
        }).eq("id", liveMatchId);
        setShowConfirm(`GOL! ${liveForTeam === "vch" ? "VCH" : liveMatch?.away_team} ${newHome}–${newAway}`);
        setTimeout(() => setShowConfirm(null), 3000);
      }
      setLiveMsg("✅ Evento aggiunto!");
      setLivePlayer("");
      setLivePlayerOut("");
      setLiveMinute("");
      fetchAll();
      fetchLiveEvents(liveMatchId);
    }
  }

  async function deleteEvent(eventId: string, eventType: string, forTeam: string | null) {
    if (!confirm("Annullare questo evento?")) return;
    if (eventType === "gol" && liveMatchId) {
      const newHome = forTeam === "vch" ? Math.max(0, parseInt(liveHome) - 1) : parseInt(liveHome);
      const newAway = forTeam === "opponent" ? Math.max(0, parseInt(liveAway) - 1) : parseInt(liveAway);
      setLiveHome(String(newHome));
      setLiveAway(String(newAway));
      await supabase.from("matches").update({ home_score: newHome, away_score: newAway }).eq("id", liveMatchId);
    }
    await supabase.from("match_events").delete().eq("id", eventId);
    setLiveMsg("↩️ Evento annullato");
    if (liveMatchId) fetchLiveEvents(liveMatchId);
    fetchAll();
  }

  async function endMatch() {
    if (!liveMatchId) return;
    if (!confirm("Terminare la partita?")) return;
    await supabase.from("matches").update({
      status: "finished",
      live_period: "finished",
      live_minute_set_at: null,
    }).eq("id", liveMatchId);
    setLiveMatchId(null);
    setLiveMsg("");
    fetchAll();
  }

  const liveMatch = matches.find(m => m.id === liveMatchId);

  const periodLabel: Record<string, string> = {
    first_half: "🔴 Primo tempo",
    half_time: "⏸ Intervallo",
    second_half: "🔴 Secondo tempo",
    extra_time: "⚡ Supplementari",
    finished: "✅ Terminata",
  };

  const eventEmoji: Record<string, string> = {
    gol: "⚽",
    autorete: "🙈",
    assist: "🎯",
    ammonizione: "🟨",
    espulsione: "🟥",
    cambio: "🔄",
    rigore_segnato: "⚽✅",
    rigore_parato: "🧤",
    rigore_sbagliato: "❌",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Partite</h1>

      {/* CONFERMA GOL */}
      {showConfirm && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white font-extrabold text-xl px-8 py-4 rounded-2xl shadow-2xl animate-bounce">
          {showConfirm}
        </div>
      )}

      {/* PANNELLO LIVESCORE */}
      {liveMatchId && liveMatch && (
        <div className="bg-brand-blue text-white rounded-2xl p-6 mb-10 shadow-lg">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-brand-red animate-pulse inline-block" />
              <span className="font-bold text-lg">VCH vs {liveMatch.away_team}</span>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
              {periodLabel[liveMatch.live_period ?? "first_half"]}
            </span>
          </div>

          {/* Punteggio */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">VCH</div>
              <input type="number" min="0" className="w-16 text-center text-3xl font-extrabold bg-white/10 border border-white/20 rounded-xl py-2 text-white" value={liveHome} onChange={e => setLiveHome(e.target.value)} />
            </div>
            <div className="text-3xl font-extrabold text-white/40">–</div>
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">{liveMatch.away_team}</div>
              <input type="number" min="0" className="w-16 text-center text-3xl font-extrabold bg-white/10 border border-white/20 rounded-xl py-2 text-white" value={liveAway} onChange={e => setLiveAway(e.target.value)} />
            </div>
          </div>
          <button onClick={updateLiveScore} className="w-full bg-white text-brand-blue font-bold py-2 rounded-full mb-4 hover:opacity-90">
            Aggiorna punteggio
          </button>

          {/* Gestione tempi */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold mb-3">⏱️ Gestione tempi</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setPeriod("half_time", 45)} className="bg-yellow-500 text-white text-xs font-bold py-2 rounded-full hover:opacity-90">
                ⏸ Fine 1° tempo
              </button>
              <button onClick={() => setPeriod("second_half", 45)} className="bg-green-500 text-white text-xs font-bold py-2 rounded-full hover:opacity-90">
                ▶️ Inizio 2° tempo
              </button>
              <button onClick={() => setPeriod("extra_time", 90)} className="bg-purple-500 text-white text-xs font-bold py-2 rounded-full hover:opacity-90">
                ⚡ Supplementari
              </button>
              <button onClick={stopTimer} className="bg-white/20 text-white text-xs font-semibold py-2 rounded-full hover:bg-white/30">
                ⏸ Ferma timer
              </button>
            </div>

            {/* Timer manuale */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number" min="0" max="120"
                  className="w-16 text-center text-lg font-extrabold bg-white/10 border border-white/20 rounded-xl py-1.5 text-white"
                  value={liveMinuteDisplay}
                  onChange={e => setLiveMinuteDisplay(e.target.value)}
                  placeholder="0"
                />
                <span className="text-white/60">+</span>
                <input
                  type="number" min="0" max="20"
                  className="w-12 text-center text-lg font-extrabold bg-white/10 border border-white/20 rounded-xl py-1.5 text-white"
                  value={liveExtraTime}
                  onChange={e => setLiveExtraTime(e.target.value)}
                  placeholder="0"
                />
                <span className="text-white/60 text-sm">'</span>
              </div>
              <button onClick={updateLiveMinute} className="bg-white text-brand-blue text-xs font-bold px-4 py-2 rounded-full hover:opacity-90">
                Aggiorna
              </button>
            </div>
            <p className="text-xs text-white/40 mt-2">Minuto + recupero. Il timer riparte da qui.</p>
          </div>

          {/* Orario inizio */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold mb-2">🕐 Orario effettivo inizio</div>
            <div className="flex items-center gap-2">
              <input type="time" className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white" value={liveStartTime} onChange={e => setLiveStartTime(e.target.value)} />
              <button onClick={updateStartTime} className="bg-white text-brand-blue text-xs font-bold px-4 py-2 rounded-full hover:opacity-90">
                Aggiorna
              </button>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold mb-2">🏟️ Logo avversario</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {liveOpponentLogo && (
                  <img src={liveOpponentLogo} alt="logo" className="w-10 h-10 rounded-full object-contain bg-white p-1 shrink-0" />
                )}
                <label className="cursor-pointer bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-4 py-2 rounded-full transition shrink-0">
                  {liveOpponentLogoUploading ? "Caricamento..." : "📁 Carica file"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={liveOpponentLogoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !liveMatchId) return;
                      setLiveOpponentLogoUploading(true);
                      const { uploadImage } = await import("@/lib/storage");
                      const url = await uploadImage(file, "opponents");
                      if (url) {
                        setLiveOpponentLogo(url);
                        await supabase.from("matches").update({ opponent_logo_url: url }).eq("id", liveMatchId);
                        setLiveMsg("✅ Logo aggiornato!");
                        fetchAll();
                      }
                      setLiveOpponentLogoUploading(false);
                    }}
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40"
                  value={liveOpponentLogo}
                  onChange={e => setLiveOpponentLogo(e.target.value)}
                  placeholder="o incolla URL..."
                />
                <button
                  onClick={async () => {
                    if (!liveMatchId || !liveOpponentLogo) return;
                    await supabase.from("matches").update({ opponent_logo_url: liveOpponentLogo }).eq("id", liveMatchId);
                    setLiveMsg("✅ Logo salvato!");
                    fetchAll();
                  }}
                  className="bg-white text-brand-blue text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 shrink-0"
                >
                  Salva
                </button>
              </div>
            </div>
          </div>

          {/* Aggiungi evento */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold mb-3">Aggiungi evento</div>

            {/* Squadra */}
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setLiveForTeam("vch")} className={`flex-1 py-2 rounded-full text-xs font-bold transition ${liveForTeam === "vch" ? "bg-white text-brand-blue" : "bg-white/10 text-white"}`}>
                ⚽ VCH
              </button>
              <button type="button" onClick={() => setLiveForTeam("opponent")} className={`flex-1 py-2 rounded-full text-xs font-bold transition ${liveForTeam === "opponent" ? "bg-white text-brand-blue" : "bg-white/10 text-white"}`}>
                ⚽ {liveMatch.away_team}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white col-span-2" value={livePlayer} onChange={e => setLivePlayer(e.target.value)}>
                <option value="">– Seleziona giocatore –</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>

              {liveEventType === "cambio" && (
                <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white col-span-2" value={livePlayerOut} onChange={e => setLivePlayerOut(e.target.value)}>
                  <option value="">– Giocatore che esce –</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              )}

              <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white" value={liveEventType} onChange={e => setLiveEventType(e.target.value)}>
                <option value="gol">⚽ Gol</option>
                <option value="autorete">🙈 Autorete</option>
                <option value="assist">🎯 Assist</option>
                <option value="ammonizione">🟨 Ammonizione</option>
                <option value="espulsione">🟥 Espulsione</option>
                <option value="cambio">🔄 Cambio</option>
                <option value="rigore_segnato">⚽✅ Rigore segnato</option>
                <option value="rigore_parato">🧤 Rigore parato</option>
                <option value="rigore_sbagliato">❌ Rigore sbagliato</option>
              </select>

              <input type="number" min="1" max="120" placeholder="Minuto" className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40" value={liveMinute} onChange={e => setLiveMinute(e.target.value)} />
            </div>

            <button onClick={addLiveEvent} disabled={!livePlayer} className="w-full bg-brand-red text-white font-semibold py-2 rounded-full hover:opacity-90 disabled:opacity-40">
              Aggiungi evento
            </button>
          </div>

          {/* Lista eventi live */}
          {liveEvents.length > 0 && (
            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <div className="text-sm font-semibold mb-3">📋 Eventi partita</div>
              <div className="flex flex-col gap-2">
                {liveEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span>{eventEmoji[ev.event_type] ?? "📋"}</span>
                      <span className="font-semibold">{ev.player?.full_name ?? "–"}</span>
                      {ev.player_out && <span className="text-white/50">↔️ {ev.player_out.full_name}</span>}
                      <span className="text-white/50">{ev.minute ? `${ev.minute}'` : ""}</span>
                      <span className="text-white/40">{ev.for_team === "opponent" ? `(${liveMatch.away_team})` : "(VCH)"}</span>
                    </div>
                    <button onClick={() => deleteEvent(ev.id, ev.event_type, ev.for_team)} className="text-white/40 hover:text-brand-red transition text-base">
                      ↩️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {liveMsg && <p className="text-xs text-green-300 text-center mb-3">{liveMsg}</p>}

          <button onClick={endMatch} className="w-full bg-red-800 text-white font-bold py-3 rounded-full hover:opacity-90 text-sm">
            ✅ Fine partita
          </button>
        </div>
      )}

      {editMatch && (
        <div className="bg-white border-2 border-brand-blue rounded-2xl shadow-sm p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-brand-blue">✏️ Modifica partita</h2>
            <button onClick={() => setEditMatch(null)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
          </div>
          <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Avversario *</label>
              <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.away_team} onChange={e => setEditForm(f => ({ ...f, away_team: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data *</label>
              <input required type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.match_date} onChange={e => setEditForm(f => ({ ...f, match_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Orario</label>
              <input type="time" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.match_time} onChange={e => setEditForm(f => ({ ...f, match_time: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Casa / Trasferta</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.is_home ? "1" : "0"} onChange={e => setEditForm(f => ({ ...f, is_home: e.target.value === "1" }))}>
                <option value="1">Casa</option>
                <option value="0">Trasferta</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Stato</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="scheduled">Programmata</option>
                <option value="live">In corso</option>
                <option value="finished">Terminata</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Logo avversario (URL)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.opponent_logo_url} onChange={e => setEditForm(f => ({ ...f, opponent_logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Gol VCH</label>
              <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.home_score} onChange={e => setEditForm(f => ({ ...f, home_score: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Gol Avversario</label>
              <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.away_score} onChange={e => setEditForm(f => ({ ...f, away_score: e.target.value }))} />
            </div>
            {/* Instagram Reels */}
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-2 block font-semibold">🎬 Instagram Reels</label>
              <div className="flex gap-2 mb-2">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="https://www.instagram.com/reel/..."
                  value={editNewReel}
                  onChange={e => setEditNewReel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const url = editNewReel.trim();
                      if (url && !editReels.includes(url)) {
                        setEditReels(r => [...r, url]);
                        setEditNewReel("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = editNewReel.trim();
                    if (url && !editReels.includes(url)) {
                      setEditReels(r => [...r, url]);
                      setEditNewReel("");
                    }
                  }}
                  className="bg-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 shrink-0"
                >
                  Aggiungi
                </button>
              </div>
              {editReels.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {editReels.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-lg px-3 py-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-pink-500 shrink-0">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <span className="text-xs text-gray-600 truncate flex-1">{url}</span>
                      <button
                        type="button"
                        onClick={() => setEditReels(r => r.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 transition text-sm font-bold shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <button type="submit" disabled={editLoading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
                {editLoading ? "Salvataggio..." : "Salva modifiche"}
              </button>
              {editMsg && <span className="ml-4 text-sm text-green-600">{editMsg}</span>}
            </div>
          </form>
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
                <input type="file" accept="image/*" className="hidden" disabled={opponentLogoUploading}
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
              <span className="text-xs text-gray-400">o incolla URL</span>
              <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.opponent_logo_url} onChange={e => setForm(f => ({ ...f, opponent_logo_url: e.target.value }))} placeholder="https://..." />
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse inline-block" />
                  <span className="text-xs font-bold text-brand-red">
                    {periodLabel[m.live_period ?? "first_half"]}
                  </span>
                </div>
              )}
              <div className="font-semibold text-brand-blue text-sm flex items-center gap-2">
                {m.opponent_logo_url && <img src={m.opponent_logo_url} alt={m.away_team} className="w-6 h-6 object-contain rounded" />}
                VCH vs {m.away_team} · {m.is_home ? "Casa" : "Trasferta"}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(m.match_date).toLocaleDateString("it-IT")} · {m.competition?.name ?? "–"}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {m.status === "scheduled" && (
                <button onClick={() => startLive(m)} className="text-xs bg-brand-red text-white px-3 py-1 rounded-full hover:opacity-90">
                  🔴 Inizia live
                </button>
              )}
              {m.status === "live" && (
                <button onClick={() => startLive(m)} className="text-xs bg-brand-red text-white px-3 py-1 rounded-full animate-pulse">
                  🔴 Gestisci live
                </button>
              )}
              {m.status === "finished" && (
                <span className="text-sm font-bold text-brand-red">{m.home_score} – {m.away_score}</span>
              )}
              <button onClick={() => openEdit(m)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition">
                ✏️ Modifica
              </button>
              <button onClick={() => handleDelete(m.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
