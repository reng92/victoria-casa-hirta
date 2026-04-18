"use client";
import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import ImageUpload from "@/components/ImageUpload";

interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  maps_url: string | null;
  photo_url: string | null;
}

const emptyForm = { name: "", address: "", city: "", maps_url: "", photo_url: "" };

export default function AdminCampi() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchVenues(); }, []);

  async function fetchVenues() {
    const { data } = await supabase.from("venues").select("*").order("name");
    setVenues((data as unknown as Venue[]) ?? []);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("venues").insert({
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      maps_url: form.maps_url || null,
      photo_url: form.photo_url || null,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Campo salvato!"); setForm(emptyForm); fetchVenues(); }
    setLoading(false);
  }

  function openEdit(v: Venue) {
    setEditVenue(v);
    setEditForm({
      name: v.name,
      address: v.address ?? "",
      city: v.city ?? "",
      maps_url: v.maps_url ?? "",
      photo_url: v.photo_url ?? "",
    });
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editVenue) return;
    setLoading(true);
    const { error } = await supabase.from("venues").update({
      name: editForm.name,
      address: editForm.address || null,
      city: editForm.city || null,
      maps_url: editForm.maps_url || null,
      photo_url: editForm.photo_url || null,
    }).eq("id", editVenue.id);
    if (error) setMsg("Errore: " + error.message);
    else { setEditVenue(null); fetchVenues(); }
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

      {/* Add form */}
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
            <ImageUpload folder="venues" label="Foto campo" onUploaded={url => setForm(f => ({ ...f, photo_url: url }))} />
            {form.photo_url && (
              <img src={form.photo_url} alt="preview" className="mt-2 h-24 rounded-xl object-cover border border-gray-200" />
            )}
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Salva campo"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {venues.map((v) => (
          <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            {v.photo_url
              ? <img src={v.photo_url} alt={v.name} className="w-16 h-12 rounded-lg object-cover border border-gray-200 shrink-0" />
              : <div className="w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 shrink-0 text-xl">🏟️</div>
            }
            <div className="flex-1 min-w-0">
              <span className="font-bold text-brand-blue">{v.name}</span>
              {v.city && <span className="ml-2 text-xs text-gray-400">{v.city}</span>}
              {v.address && <span className="ml-2 text-xs text-gray-400">· {v.address}</span>}
              {v.maps_url && (
                <a href={v.maps_url} target="_blank" rel="noreferrer" className="ml-2 text-xs text-blue-400 hover:underline">Maps</a>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(v)} className="text-xs text-gray-400 hover:text-brand-blue transition">✏️ Modifica</button>
              <button onClick={() => handleDelete(v.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editVenue && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-lg text-brand-blue mb-4">Modifica campo</h2>
            <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Nome campo *</label>
                <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Città</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Indirizzo</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Link Google Maps</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.maps_url} onChange={e => setEditForm(f => ({ ...f, maps_url: e.target.value }))} placeholder="https://maps.google.com/..." />
              </div>
              <div className="sm:col-span-2">
                <ImageUpload folder="venues" label="Cambia foto campo" onUploaded={url => setEditForm(f => ({ ...f, photo_url: url }))} />
                {editForm.photo_url && (
                  <img src={editForm.photo_url} alt="preview" className="mt-2 h-24 rounded-xl object-cover border border-gray-200" />
                )}
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
                  {loading ? "Salvataggio..." : "Salva modifiche"}
                </button>
                <button type="button" onClick={() => setEditVenue(null)} className="text-sm text-gray-400 hover:text-gray-600 transition">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
