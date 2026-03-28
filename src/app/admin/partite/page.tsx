"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Competition { id: string; name: string; }
interface Venue { id: string; name: string; }
interface Match {
  id: string;
  match_date: string;
  away_team: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  status: string;
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
};

export default function AdminPartite() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [{ data: m }, { data: c }, { data: v }] = await Promise.all([
      supabase.from("matches").select("id, match_date, away_team, is_home, home_score, away_score, status, competition:competitions(name)").order("match_date", { ascending: false }),
      supabase.from("competitions").select("id, name"),
      supabase.from("venues").select("id, name"),
    ]);
    setMatches((m as Match[]) ?? []);
    setCompetitions((c as Competition[]) ?? []);
    setVenues((v as Venue[]) ?? []);
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

  async function updateScore(id: string, home_score: number, away_score: number, status: string) {
    await supabase.from("matches").update({ home_score, away_score, status }).eq("id", id);
    fetchAll();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Partite</h1>

      {/* Form nuova partita */}
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
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Gol VCH</label>
            <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.home_score} onChange={e => setForm(f => ({ ...f, home_score: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Gol Avversario</label>
            <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.away_score} onChange={e => setForm(f => ({ ...f, away_score: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Salva partita"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      {/* Lista partite */}
      <div className="flex flex-col gap-3">
        {matches.map((m) => (
          <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <div className="font-semibold text-brand-blue text-sm">
                VCH vs {m.away_team} · {m.is_home ? "Casa" : "Trasferta"}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(m.match_date).toLocaleDateString("it-IT")} · {m.competition?.name ?? "–"} · {m.status}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.status !== "finished" && (
                <>
                  <button
                    onClick={() => {
                      const hs = prompt("Gol VCH:");
                      const as_ = prompt("Gol avversario:");
                      if (hs !== null && as_ !== null) updateScore(m.id, parseInt(hs), parseInt(as_), "live");
                    }}
                    className="text-xs bg-brand-blue text-white px-3 py-1 rounded-full hover:opacity-90"
                  >
                    🔴 Live
                  </button>
                  <button
                    onClick={() => {
                      const hs = prompt("Gol VCH finali:");
                      const as_ = prompt("Gol avversario finali:");
                      if (hs !== null && as_ !== null) updateScore(m.id, parseInt(hs), parseInt(as_), "finished");
                    }}
                    className="text-xs bg-brand-red text-white px-3 py-1 rounded-full hover:opacity-90"
                  >
                    ✅ Fine
                  </button>
                </>
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
