"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/storage";

interface Match {
  id: string;
  match_date: string;
  away_team: string;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  match: { away_team: string; match_date: string } | null;
}

const emptyForm = { match_id: "", caption: "" };

export default function AdminGalleria() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase
        .from("gallery")
        .select("id, photo_url, caption, created_at, match:matches(away_team, match_date)")
        .order("created_at", { ascending: false }),
      supabase
        .from("matches")
        .select("id, match_date, away_team")
        .order("match_date", { ascending: false }),
    ]);
    setPhotos((p as Photo[]) ?? []);
    setMatches((m as Match[]) ?? []);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file, "gallery");
    if (url) setUploadedUrl(url);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadedUrl) { setMsg("Carica prima una foto."); return; }
    setLoading(true);
    setMsg("");
    const { error } = await supabase.from("gallery").insert({
      photo_url: uploadedUrl,
      caption: form.caption || null,
      match_id: form.match_id || null,
    });
    if (error) setMsg("Errore: " + error.message);
    else {
      setMsg("Foto aggiunta!");
      setForm(emptyForm);
      setUploadedUrl(null);
      fetchAll();
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa foto?")) return;
    await supabase.from("gallery").delete().eq("id", id);
    fetchAll();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Galleria</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Carica foto</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Foto *</label>
            <div className="flex items-center gap-4">
              {uploadedUrl && (
                <img src={uploadedUrl} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
              )}
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-full transition">
                {uploading ? "Caricamento..." : "Scegli foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
              {uploadedUrl && <span className="text-xs text-green-600">✓ Caricata</span>}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Didascalia</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.caption}
              onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
              placeholder="es. Gol di Mario, 45'"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Partita collegata</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.match_id}
              onChange={e => setForm(f => ({ ...f, match_id: e.target.value }))}
            >
              <option value="">– Nessuna –</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  VCH vs {m.away_team} · {new Date(m.match_date).toLocaleDateString("it-IT")}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading || uploading}
              className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Salvataggio..." : "Aggiungi alla galleria"}
            </button>
            {msg && <span className="ml-4 text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
            <img
              src={p.photo_url}
              alt={p.caption ?? "Foto"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
              {p.caption && <p className="text-white text-xs text-center">{p.caption}</p>}
              <button
                onClick={() => handleDelete(p.id)}
                className="text-xs bg-brand-red text-white px-3 py-1 rounded-full"
              >
                🗑️ Elimina
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
