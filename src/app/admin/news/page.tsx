"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface NewsItem { id: string; title: string; body: string | null; published_at: string; }
const emptyForm = { title: "", body: "" };

export default function AdminNews() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchNews(); }, []);

  async function fetchNews() {
    const { data } = await supabase.from("news").select("id, title, body, published_at").order("published_at", { ascending: false });
    setNewsList((data as NewsItem[]) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("news").insert({
      title: form.title,
      body: form.body || null,
      published_at: new Date().toISOString(),
    });
    if (error) setMsg("Errore: " + error.message);
    else { setMsg("News pubblicata!"); setForm(emptyForm); fetchNews(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa news?")) return;
    await supabase.from("news").delete().eq("id", id);
    fetchNews();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – News</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Pubblica news</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titolo *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Testo</label>
            <textarea rows={5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div>
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Pubblicazione..." : "Pubblica"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {newsList.map((n) => (
          <div key={n.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start justify-between shadow-sm gap-4">
            <div>
              <div className="font-bold text-brand-blue text-sm">{n.title}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(n.published_at).toLocaleDateString("it-IT")}</div>
              {n.body && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{n.body}</div>}
            </div>
            <button onClick={() => handleDelete(n.id)} className="text-xs text-gray-400 hover:text-red-500 transition shrink-0">🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
