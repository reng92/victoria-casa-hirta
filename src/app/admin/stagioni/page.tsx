"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Season { id: string; name: string; start_date: string | null; end_date: string | null; is_current: boolean; }
const emptyForm = { name: "", start_date: "", end_date: "", is_current: false };

export default function AdminStagioni() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchSeasons(); }, []);

  async function fetchSeasons() {
    const { data } = await supabase.from("seasons").select("*").order("start_date", { ascending: false });
    setSeasons((data as Season[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    if (form.is_current) {
      await supabase.from("seasons").update({ is_current: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    }
    const { error } = await supabase.from("seasons").insert({
      name: form.name,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_current: form.is_current,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Stagione salvata!"); setForm(emptyForm); fetchSeasons(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa stagione?")) return;
    await supabase.from("seasons").delete().eq("id", id);
    fetchSeasons();
  }

  async function setCurrent(id: string) {
    await supabase.from("seasons").update({ is_current: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("seasons").update({ is_current: true }).eq("id", id);
    fetchSeasons();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Stagioni</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi stagione</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Nome stagione * (es. 2024/2025)</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data inizio</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data fine</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="is_current" checked={form.is_current} onChange={e => setForm(f => ({ ...f, is_current: e.target.checked }))} />
            <label htmlFor="is_current" className="text-sm text-gray-600">Stagione corrente</label>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Salva stagione"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {seasons.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="font-bold text-brand-blue">{s.name}</span>
              {s.is_current && <span className="ml-2 text-xs bg-brand-red text-white px-2 py-0.5 rounded-full">Corrente</span>}
              {s.start_date && <span className="ml-2 text-xs text-gray-400">{s.start_date} → {s.end_date}</span>}
            </div>
            <div className="flex gap-2">
              {!s.is_current && (
                <button onClick={() => setCurrent(s.id)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200">
                  Imposta corrente
                </button>
              )}
              <button onClick={() => handleDelete(s.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
