"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { refreshPages } from "@/lib/revalidate";
import LogoField from "@/components/admin/LogoField";

interface NewsItem { id: string; title: string; body: string | null; cover_url: string | null; published_at: string; }
const emptyForm = { title: "", body: "", cover_url: "" };

export default function AdminNews() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchNews(); }, []);

  async function fetchNews() {
    const { data } = await supabase.from("news").select("id, title, body, cover_url, published_at").order("published_at", { ascending: false });
    setNewsList((data as unknown as NewsItem[]) ?? []);
  }

  function startEdit(n: NewsItem) {
    setEditingId(n.id);
    setForm({ title: n.title, body: n.body ?? "", cover_url: n.cover_url ?? "" });
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const fields = {
      title: form.title,
      body: form.body || null,
      cover_url: form.cover_url || null,
    };
    const { error } = editingId
      ? await supabase.from("news").update(fields).eq("id", editingId)
      : await supabase.from("news").insert({ ...fields, published_at: new Date().toISOString() });
    if (error) setMsg("Errore: " + error.message);
    else {
      await refreshPages(["/", "/news"]);
      setMsg(editingId ? "News aggiornata!" : "News pubblicata!");
      setEditingId(null);
      setForm(emptyForm);
      fetchNews();
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa news?")) return;
    await supabase.from("news").delete().eq("id", id);
    if (editingId === id) cancelEdit();
    await refreshPages(["/", "/news"]);
    fetchNews();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – News</h1>

      <div className={`bg-white border rounded-2xl shadow-sm p-6 mb-10 ${editingId ? "border-2 border-brand-blue" : "border-gray-100"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-brand-blue">{editingId ? "✏️ Modifica news" : "Pubblica news"}</h2>
          {editingId && <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-red-500 text-xl" aria-label="Annulla modifica">✕</button>}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titolo *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <LogoField
            value={form.cover_url}
            onChange={url => setForm(f => ({ ...f, cover_url: url }))}
            folder="news"
            label="Foto di copertina (consigliato orizzontale 16:9)"
            shape="square"
            size={96}
          />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Testo</label>
            <textarea rows={8} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div>
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : editingId ? "Salva modifiche" : "Pubblica"}
            </button>
            {msg && <span className={`ml-4 text-sm ${msg.startsWith("Errore") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {newsList.map((n) => (
          <div key={n.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start justify-between shadow-sm gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {n.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.cover_url} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0 bg-gray-100" />
              ) : (
                <div className="w-20 h-14 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-[10px] text-gray-400">senza foto</div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-brand-blue text-sm">{n.title}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(n.published_at).toLocaleDateString("it-IT")}</div>
                {n.body && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{n.body}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => startEdit(n)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition">✏️ Modifica</button>
              <button onClick={() => handleDelete(n.id)} className="text-xs text-gray-400 hover:text-red-500 transition" aria-label="Elimina news">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
