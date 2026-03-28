"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Venue { id: string; name: string; address: string | null; city: string | null; maps_url: string | null; }
const emptyForm = { name: "", address: "", city: "", maps_url: "" };

export default function AdminCampi() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchVenues(); }, []);

  async function fetchVenues() {
    const { data } = await supabase.from("venues").select("*").order("name");
    setVenues((data as unknown as Venue[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("venues").insert({
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      maps_url: form.maps_url || null,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Campo salvato!"); setForm(emptyForm); fetchVenues(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo campo?")) return;
    await supabase.from("venues").delete().eq("id", id);
    fetchVenues();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Campi</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi campo</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Nome campo *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Città</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Indirizzo</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Link Google Maps</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.maps_url} onChange={e => setForm(f => ({ ...f, maps_url: e.target.value }))} placeholder="https://maps.google.com/..." />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Salva campo"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {venues.map((v) => (
          <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="font-bold text-brand-blue">{v.name}</span>
              {v.city && <span className="ml-2 text-xs text-gray-400">{v.city}</span>}
              {v.address && <span className="ml-2 text-xs text-gray-400">· {v.address}</span>}
            </div>
            <button onClick={() => handleDelete(v.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
