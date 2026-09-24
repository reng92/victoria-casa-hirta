"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import LogoField from "@/components/admin/LogoField";

interface MatchRow {
  id: string;
  away_team: string;
  opponent_logo_url: string | null;
  match_date: string;
}

interface Opponent {
  key: string;
  name: string;
  matches: number;
  logo: string;
  variants: string[];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Loghi avversari: un logo per ogni squadra affrontata, applicato a tutte
 * le partite con quel nome (ignorando maiuscole e spazi).
 */
export default function AdminLoghi() {
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");

  useEffect(() => { fetchRows(); }, []);

  async function fetchRows() {
    const { data } = await supabase
      .from("matches")
      .select("id, away_team, opponent_logo_url, match_date")
      .order("match_date", { ascending: false });
    setRows((data as unknown as MatchRow[]) ?? []);
  }

  const opponents = useMemo<Opponent[]>(() => {
    const map = new Map<string, Opponent>();
    for (const r of rows) {
      const key = norm(r.away_team);
      let o = map.get(key);
      if (!o) {
        o = { key, name: r.away_team.trim(), matches: 0, logo: "", variants: [] };
        map.set(key, o);
      }
      o.matches += 1;
      if (!o.logo && r.opponent_logo_url) o.logo = r.opponent_logo_url; // il più recente con logo
      if (!o.variants.includes(r.away_team)) o.variants.push(r.away_team);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const visible = opponents.filter((o) => !filter || o.name.toLowerCase().includes(filter.toLowerCase()));
  const missing = opponents.filter((o) => !o.logo).length;

  async function save(o: Opponent) {
    const url = (drafts[o.key] ?? o.logo).trim();
    setSaving(o.key);
    setMsg((m) => ({ ...m, [o.key]: "" }));
    const ids = rows.filter((r) => norm(r.away_team) === o.key).map((r) => r.id);
    const { error } = await supabase
      .from("matches")
      .update({ opponent_logo_url: url || null })
      .in("id", ids);
    setSaving(null);
    if (error) {
      setMsg((m) => ({ ...m, [o.key]: "Errore: " + error.message }));
      return;
    }
    setMsg((m) => ({ ...m, [o.key]: `Logo applicato a ${ids.length} partit${ids.length === 1 ? "a" : "e"}.` }));
    setDrafts((d) => { const n = { ...d }; delete n[o.key]; return n; });
    fetchRows();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Admin – Loghi avversari</h1>
      <p className="text-gray-500 text-sm mb-6">
        Il logo viene applicato a tutte le partite contro la stessa squadra, passate e future.
        {missing > 0 && <span className="ml-2 text-amber-600 font-semibold">{missing} senza logo</span>}
      </p>

      <input
        className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-6"
        placeholder="Cerca squadra..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="flex flex-col gap-4">
        {visible.map((o) => {
          const draft = drafts[o.key] ?? o.logo;
          const dirty = draft !== o.logo;
          return (
            <div key={o.key} className={`bg-white border rounded-2xl p-5 shadow-sm ${o.logo ? "border-gray-100" : "border-amber-200"}`}>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <div className="font-bold text-brand-blue">{o.name}</div>
                  <div className="text-xs text-gray-400">
                    {o.matches} partit{o.matches === 1 ? "a" : "e"}
                    {o.variants.length > 1 && ` · nomi usati: ${o.variants.join(", ")}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {msg[o.key] && <span className={`text-xs ${msg[o.key].startsWith("Errore") ? "text-brand-red" : "text-green-600"}`}>{msg[o.key]}</span>}
                  <button
                    onClick={() => save(o)}
                    disabled={!dirty || saving === o.key}
                    className="bg-brand-blue text-white text-xs font-semibold px-4 py-2 rounded-full hover:opacity-90 transition disabled:opacity-40"
                  >
                    {saving === o.key ? "Salvataggio..." : "Applica a tutte"}
                  </button>
                </div>
              </div>
              <LogoField
                value={draft}
                onChange={(url) => setDrafts((d) => ({ ...d, [o.key]: url }))}
                folder="opponents"
                label="Logo"
              />
            </div>
          );
        })}
        {visible.length === 0 && <p className="text-sm text-gray-400">Nessuna squadra trovata.</p>}
      </div>
    </div>
  );
}
