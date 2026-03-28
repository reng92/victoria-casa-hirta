"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Competition { id: string; name: string; }
interface Standing { id: string; team_name: string; played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; points: number; competition_id: string; }
const emptyForm = { team_name: "", competition_id: "", played: "", won: "", drawn: "", lost: "", goals_for: "", goals_against: "", points: "" };

export default function AdminClassifica() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("standings").select("*").order("points", { ascending: false }),
      supabase.from("competitions").select("id, name"),
    ]);
    setStandings((s as unknown as Standing[]) ?? []);
    setCompetitions((c as Competition[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("standings").insert({
      team_name: form.team_name,
      competition_id: form.competition_id || null,
      played: parseInt(form.played) || 0,
      won: parseInt(form.won) || 0,
      drawn: parseInt(form.drawn) || 0,
      lost: parseInt(form.lost) || 0,
      goals_for: parseInt(form.goals_for) || 0,
      goals_against: parseInt(form.goals_against) || 0,
      points: parseInt(form.points) || 0,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Riga salvata!"); setForm(emptyForm); fetchAll(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa riga?")) return;
    await supabase.from("standings").delete().eq("id", id);
    fetchAll();
  }

  const f = (key: keyof typeof emptyForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Classifica</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi riga classifica</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Squadra *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" {...f("team_name")} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Competizione</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" {...f("competition_id")}>
              <option value="">– Seleziona –</option>
              {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {[
            { key: "played", label: "G" },
            { key: "won", label: "V" },
            { key: "drawn", label: "N" },
            { key: "lost", label: "P" },
            { key: "goals_for", label: "GF" },
            { key: "goals_against", label: "GS" },
            { key: "points", label: "Pt" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" {...f(key as keyof typeof emptyForm)} />
            </div>
          ))}
          <div className="col-span-2 sm:col-span-4">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Salva riga"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {standings.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="text-sm">
              <span className="font-bold text-brand-blue">{s.team_name}</span>
              <span className="ml-3 text-gray-500">G:{s.played} V:{s.won} N:{s.drawn} P:{s.lost} GF:{s.goals_for} GS:{s.goals_against}</span>
              <span className="ml-3 font-bold text-brand-red">Pt:{s.points}</span>
            </div>
            <button onClick={() => handleDelete(s.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
