"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Commentary {
  id: string;
  minute: number | null;
  text: string;
}

/**
 * Cronaca live minuto per minuto di una partita (tabella match_commentary).
 * `dark` per il pannello livescore, chiaro per il form di modifica.
 */
export default function CommentaryEditor({
  matchId,
  defaultMinute = "",
  dark = false,
}: {
  matchId: string;
  defaultMinute?: string;
  dark?: boolean;
}) {
  const [items, setItems] = useState<Commentary[]>([]);
  const [minute, setMinute] = useState(defaultMinute);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchItems(); }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setMinute(defaultMinute); }, [defaultMinute]);

  async function fetchItems() {
    const { data } = await supabase
      .from("match_commentary")
      .select("id, minute, text")
      .eq("match_id", matchId)
      .order("minute", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setItems((data as Commentary[] | null) ?? []);
  }

  async function add() {
    const body = text.trim();
    if (!body) return;
    setSaving(true);
    setError("");
    const { error } = await supabase.from("match_commentary").insert({
      match_id: matchId,
      minute: minute !== "" ? parseInt(minute) : null,
      text: body,
    });
    if (error) setError("Errore: " + error.message);
    else { setText(""); fetchItems(); }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo aggiornamento?")) return;
    await supabase.from("match_commentary").delete().eq("id", id);
    fetchItems();
  }

  const field = dark
    ? "bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40"
    : "border border-gray-200 rounded-lg px-3 py-2 text-sm";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="number" min="0" max="130" placeholder="Min."
          className={`${field} w-20 shrink-0`}
          value={minute}
          onChange={e => setMinute(e.target.value)}
        />
        <textarea
          rows={2}
          placeholder="Es. Tiro di Rossi dal limite, para il portiere"
          className={`${field} flex-1 resize-y`}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); }
          }}
        />
      </div>
      <button
        type="button"
        onClick={add}
        disabled={saving || !text.trim()}
        className={`w-full font-semibold py-2 rounded-full hover:opacity-90 disabled:opacity-40 text-sm ${dark ? "bg-white text-brand-blue" : "bg-brand-blue text-white"}`}
      >
        {saving ? "Pubblicazione..." : "Pubblica aggiornamento"}
      </button>
      {error && <p className={`text-xs ${dark ? "text-red-300" : "text-red-600"}`}>{error}</p>}

      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-1">
          {items.map(c => (
            <li key={c.id} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${dark ? "bg-white/5" : "bg-gray-50 border border-gray-100"}`}>
              <span className={`font-bold tabular shrink-0 w-9 ${dark ? "text-white/70" : "text-gray-500"}`}>
                {c.minute != null ? `${c.minute}'` : "–"}
              </span>
              <span className="flex-1 whitespace-pre-line">{c.text}</span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className={`shrink-0 transition ${dark ? "text-white/40 hover:text-brand-red" : "text-gray-400 hover:text-red-500"}`}
                aria-label="Elimina aggiornamento"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
