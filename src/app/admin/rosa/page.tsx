"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ImageUpload from "@/components/ImageUpload";

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  is_active: boolean;
}

const emptyForm = { full_name: "", shirt_number: "", role: "attaccante", photo_url: "" };

export default function AdminRosa() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchPlayers(); }, []);

  async function fetchPlayers() {
    const { data } = await supabase.from("players").select("id, full_name, shirt_number, role, is_active").order("shirt_number", { ascending: true });
    setPlayers((data as unknown as Player[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("players").insert({
      full_name: form.full_name,
      shirt_number: form.shirt_number ? parseInt(form.shirt_number) : null,
      role: form.role,
      photo_url: form.photo_url || null,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Giocatore aggiunto!"); setForm(emptyForm); fetchPlayers(); }
    setLoading(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("players").update({ is_active: !current }).eq("id", id);
    fetchPlayers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo giocatore?")) return;
    await supabase.from("players").delete().eq("id", id);
    fetchPlayers();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Rosa</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi giocatore</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nome e cognome *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">N° maglia</label>
            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.shirt_number} onChange={e => setForm(f => ({ ...f, shirt_number: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ruolo</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="portiere">Portiere</option>
              <option value="difensore">Difensore</option>
              <option value="centrocampista">Centrocampista</option>
              <option value="attaccante">Attaccante</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <ImageUpload
              folder="players"
              label="Foto giocatore"
              onUploaded={(url) => setForm(f => ({ ...f, photo_url: url }))}
            />
            {form.photo_url && (
              <p className="text-xs text-green-600 mt-1">✓ Foto caricata</p>
            )}
          </div>
          <div className="sm:col-span-3">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Aggiungi giocatore"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {players.map((p) => (
          <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="font-bold text-brand-red mr-2">#{p.shirt_number ?? "–"}</span>
              <span className="font-semibold text-brand-blue text-sm">{p.full_name}</span>
              <span className="ml-2 text-xs text-gray-400 capitalize">{p.role}</span>
              {!p.is_active && <span className="ml-2 text-xs text-gray-300">(inattivo)</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(p.id, p.is_active)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200">
                {p.is_active ? "Disattiva" : "Attiva"}
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
