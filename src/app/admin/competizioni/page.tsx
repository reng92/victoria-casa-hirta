"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Season { id: string; name: string; }
interface Competition { id: string; name: string; type: string | null; level: string | null; organizer: string | null; season: { name: string }[] | null; }
const emptyForm = { name: "", type: "campionato", level: "regionale", organizer: "", season_id: "" };

export default function AdminCompetizioni() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("competitions").select("id, name, type, level, organizer, season:seasons(name)").order("name"),
      supabase.from("seasons").select("id, name").order("start_date", { ascending: false }),
    ]);
    setCompetitions((c as unknown as Competition[]) ?? []);
    setSeasons((s as Season[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("competitions").insert({
      name: form.name,
      type: form.type,
      level: form.level,
      organizer: form.organizer || null,
      season_id: form.season_id || null,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Competizione salvata!"); setForm(emptyForm); fetchAll(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa competizione?")) return;
    await supabase.from("competitions").delete().eq("id", id);
    fetchAll();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Competizioni</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi competizione</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Nome *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="campionato">Campionato</option>
              <option value="coppa">Coppa</option>
              <option value="torneo">Torneo</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Livello</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
              <option value="provinciale">Provinciale</option>
              <option value="regionale">Regionale</option>
              <option value="nazionale">Nazionale</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Organizzatore</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} placeholder="es. FIGC, CSI, UISP" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Stagione</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.season_id} onChange={e => setForm(f => ({ ...f, season_id: e.target.value }))}>
              <option value="">– Seleziona –</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Salva competizione"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {competitions.map((c) => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="font-bold text-brand-blue">{c.name}</span>
              {c.type && <span className="ml-2 text-xs bg-brand-blue text-white px-2 py-0.5 rounded-full capitalize">{c.type}</span>}
              {c.level && <span className="ml-2 text-xs bg-brand-red text-white px-2 py-0.5 rounded-full capitalize">{c.level}</span>}
              {c.season && c.season[0] && <span className="ml-2 text-xs text-gray-400">{c.season[0].name}</span>}
            </div>
            <button onClick={() => handleDelete(c.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
