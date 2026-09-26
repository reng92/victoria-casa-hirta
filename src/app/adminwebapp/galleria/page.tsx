"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/storage";
import { refreshPages } from "@/lib/revalidate";
import { getOpponent } from "@/lib/competitions";

interface Match {
  id: string;
  slug: string | null;
  match_date: string;
  home_team: string | null;
  away_team: string;
  is_home: boolean;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  is_cover: boolean;
  match_id: string | null;
  created_at: string;
}

/** Valore del filtro per le foto non legate a una partita (es. foto di squadra). */
const NO_MATCH = "none";

function matchLabel(m: Match) {
  const date = new Date(m.match_date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" });
  const opponent = getOpponent(m);
  return `${date} · ${m.is_home ? `Victoria Casa Hirta – ${opponent}` : `${opponent} – Victoria Casa Hirta`}`;
}

export default function AdminGalleria() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [target, setTarget] = useState("");
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase
      .from("matches")
      .select("id, slug, match_date, home_team, away_team, is_home")
      .order("match_date", { ascending: false })
      .then(({ data }) => {
        const list = (data as Match[]) ?? [];
        setMatches(list);
        // Parte dall'ultima partita giocata o in corso, la più probabile
        const now = new Date().toISOString();
        setTarget(list.find((m) => m.match_date <= now)?.id ?? list[0]?.id ?? NO_MATCH);
      });
  }, []);

  useEffect(() => {
    if (target) fetchPhotos(target);
    setMsg("");
  }, [target]);

  async function fetchPhotos(t: string) {
    let q = supabase.from("gallery").select("id, photo_url, caption, is_cover, match_id, created_at");
    q = t === NO_MATCH ? q.is("match_id", null) : q.eq("match_id", t);
    const { data } = await q.order("is_cover", { ascending: false }).order("created_at", { ascending: false });
    setPhotos((data as Photo[]) ?? []);
  }

  const match = matches.find((m) => m.id === target) ?? null;

  function pagesToRefresh() {
    return ["/", "/galleria", ...(match?.slug ? [`/calendario/${match.slug}`] : [])];
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setMsg("");
    setProgress({ done: 0, total: files.length });
    let failed = 0;
    for (const file of files) {
      const url = await uploadImage(file, "gallery");
      const { error } = url
        ? await supabase.from("gallery").insert({
            photo_url: url,
            caption: caption.trim() || null,
            match_id: target === NO_MATCH ? null : target,
          })
        : { error: true };
      if (error) failed++;
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    setCaption("");
    await refreshPages(pagesToRefresh());
    const ok = files.length - failed;
    setMsg(failed ? `Errore: ${failed} foto non caricate${ok ? `, ${ok} caricate` : ""}` : ok === 1 ? "Foto caricata!" : `${ok} foto caricate!`);
    fetchPhotos(target);
  }

  async function setCover(p: Photo) {
    if (!p.match_id) return;
    // Prima si toglie la copertina attuale: al massimo una per partita
    await supabase.from("gallery").update({ is_cover: false }).eq("match_id", p.match_id).eq("is_cover", true);
    const { error } = p.is_cover ? { error: null } : await supabase.from("gallery").update({ is_cover: true }).eq("id", p.id);
    await refreshPages(pagesToRefresh());
    setMsg(error ? "Errore: " + error.message : p.is_cover ? "Copertina tolta" : "Copertina impostata: comparirà in home");
    fetchPhotos(target);
  }

  async function saveCaption(p: Photo, value: string) {
    if ((p.caption ?? "") === value.trim()) return;
    await supabase.from("gallery").update({ caption: value.trim() || null }).eq("id", p.id);
    await refreshPages(pagesToRefresh());
    fetchPhotos(target);
  }

  async function handleDelete(p: Photo) {
    if (!confirm("Eliminare questa foto?")) return;
    await supabase.from("gallery").delete().eq("id", p.id);
    await refreshPages(pagesToRefresh());
    fetchPhotos(target);
  }

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-8">Admin – Galleria</h1>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8 flex flex-col gap-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Partita</label>
          <select className={input} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value={NO_MATCH}>Nessuna partita (foto di squadra, eventi…)</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>{matchLabel(m)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Didascalia (facoltativa, vale per le foto che carichi ora)</label>
          <input className={input} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="es. Il gol del 3-0" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`cursor-pointer bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition ${progress ? "opacity-50 pointer-events-none" : ""}`}>
            {progress ? `Caricamento ${progress.done}/${progress.total}…` : "📷 Carica foto"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={!!progress || !target} />
          </label>
          <span className="text-xs text-gray-400">Puoi selezionarne più di una insieme</span>
          {msg && <span className={`text-sm ${msg.startsWith("Errore") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-bold text-lg text-brand-blue">
          {match ? `Foto della partita · ${photos.length}` : `Foto senza partita · ${photos.length}`}
        </h2>
        {match && photos.length > 0 && (
          <p className="text-xs text-gray-500">⭐ = copertina in home nella card &quot;Ultimo risultato&quot;</p>
        )}
      </div>

      {match && photos.length > 0 && !photos.some((p) => p.is_cover) && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
          Nessuna copertina scelta: in home verrà usata l&apos;ultima foto caricata. Tocca ☆ sulla foto che preferisci.
        </p>
      )}

      {photos.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">Nessuna foto caricata.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((p) => (
          <div key={p.id} className={`bg-white rounded-xl overflow-hidden border-2 ${p.is_cover ? "border-yellow-400" : "border-gray-100"}`}>
            <div className="relative aspect-square bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo_url} alt={p.caption ?? "Foto"} className="w-full h-full object-cover" />
              {p.is_cover && (
                <span className="absolute top-2 left-2 text-[11px] font-bold bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full">⭐ Copertina</span>
              )}
            </div>
            <div className="p-2 flex flex-col gap-2">
              <input
                defaultValue={p.caption ?? ""}
                onBlur={(e) => saveCaption(p, e.target.value)}
                placeholder="Didascalia"
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs"
              />
              <div className="flex items-center justify-between gap-2">
                {p.match_id ? (
                  <button
                    onClick={() => setCover(p)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${p.is_cover ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    title={p.is_cover ? "Togli copertina" : "Usa come copertina"}
                  >
                    {p.is_cover ? "⭐ Copertina" : "☆ Copertina"}
                  </button>
                ) : <span />}
                <button onClick={() => handleDelete(p)} className="text-gray-400 hover:text-red-500 transition text-sm" aria-label="Elimina foto" title="Elimina">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
