"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

const emptyForm = { name: "", logo_url: "", website_url: "" };

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchSponsors(); }, []);

  async function fetchSponsors() {
    const { data } = await supabase.from("sponsors").select("*").order("name");
    setSponsors((data as Sponsor[]) ?? []);
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

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo sponsor?")) return;
    await supabase.from("sponsors").delete().eq("id", id);
    fetchSponsors();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Sponsor</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi sponsor</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Nome sponsor *</label>
            <input
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">URL logo (link immagine)</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.logo_url}
              onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Sito web</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.website_url}
              onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Salvataggio..." : "Salva sponsor"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sponsors.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm"
          >
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              {s.logo_url ? (
                <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-2xl">🏢</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-brand-blue text-sm">{s.name}</div>
              {s.website_url && (
                <a
                  href={s.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-red hover:underline truncate block"
                >
                  {s.website_url}
                </a>
              )}
            </div>
            <button
              onClick={() => handleDelete(s.id)}
              className="text-xs text-gray-400 hover:text-red-500 transition shrink-0"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
