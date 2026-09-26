"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LogoField from "@/components/admin/LogoField";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

const emptyForm = { name: "", logo_url: "", website_url: "" };
const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm";

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editMsg, setEditMsg] = useState("");

  useEffect(() => { fetchSponsors(); }, []);

  async function fetchSponsors() {
    const { data } = await supabase.from("sponsors").select("*").order("name");
    setSponsors((data as unknown as Sponsor[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("sponsors").insert({
      name: form.name,
      logo_url: form.logo_url || null,
      website_url: form.website_url || null,
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("Sponsor salvato!"); setForm(emptyForm); fetchSponsors(); }
    setLoading(false);
  }

  function openEdit(s: Sponsor) {
    setEditId(s.id);
    setEditForm({ name: s.name, logo_url: s.logo_url ?? "", website_url: s.website_url ?? "" });
    setEditMsg("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setLoading(true);
    setEditMsg("");
    const { error } = await supabase.from("sponsors").update({
      name: editForm.name,
      logo_url: editForm.logo_url || null,
      website_url: editForm.website_url || null,
    }).eq("id", editId);
    if (error) setEditMsg("Errore: " + error.message);
    else { setEditId(null); fetchSponsors(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo sponsor?")) return;
    await supabase.from("sponsors").delete().eq("id", id);
    fetchSponsors();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Sponsor</h1>

      {editId && (
        <div className="bg-white border-2 border-brand-blue rounded-2xl shadow-sm p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-brand-blue">✏️ Modifica sponsor</h2>
            <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
          </div>
          <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome sponsor *</label>
              <input required className={input} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Sito web</label>
              <input className={input} value={editForm.website_url} onChange={e => setEditForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <LogoField value={editForm.logo_url} onChange={url => setEditForm(f => ({ ...f, logo_url: url }))} folder="sponsors" label="Logo sponsor" shape="square" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
                {loading ? "Salvataggio..." : "Salva modifiche"}
              </button>
              <button type="button" onClick={() => setEditId(null)} className="text-sm text-gray-500 hover:text-gray-700">Annulla</button>
              {editMsg && <span className="text-sm text-brand-red">{editMsg}</span>}
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi sponsor</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nome sponsor *</label>
            <input required className={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Sito web</label>
            <input className={input} value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <LogoField value={form.logo_url} onChange={url => setForm(f => ({ ...f, logo_url: url }))} folder="sponsors" label="Logo sponsor" shape="square" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : "Salva sponsor"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sponsors.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-2xl">🏢</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-brand-blue text-sm">{s.name}</div>
              {s.website_url ? (
                <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-red hover:underline truncate block">
                  {s.website_url}
                </a>
              ) : (
                <span className="text-xs text-gray-400">Nessun sito</span>
              )}
              {!s.logo_url && <span className="text-xs text-amber-600">Logo mancante</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => openEdit(s)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition">
                ✏️ Modifica
              </button>
              <button onClick={() => handleDelete(s.id)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
