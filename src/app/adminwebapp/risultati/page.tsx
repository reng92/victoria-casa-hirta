"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Fixture,
  VCH_NAME,
  fixtureFromMatch,
  fixtureToMatchFields,
  groupOptions,
  isGroupFormat,
  isVCH,
  matchdayLabel,
  sortFixtures,
  teamKey,
} from "@/lib/competitions";
import { syncStandings, syncMessage } from "@/lib/standings";

interface Competition { id: string; name: string; format: string | null; status: string | null; }
interface StandingRow { id: string; team_name: string; group_name: string | null; }

/** Valori dei campi in modifica (stringhe, come negli input). */
interface Draft {
  date: string;
  time: string;
  matchday: string;
  group_name: string;
  round: string;
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  status: string;
}

const emptyDraft: Draft = {
  date: "", time: "", matchday: "", group_name: "", round: "",
  home_team: "", away_team: "", home_score: "", away_score: "", status: "finished",
};

const rowKey = (f: Fixture) => `${f.source}:${f.id}`;

function toDraft(f: Fixture): Draft {
  // match_date è salvato come orario "da parete" in UTC: si legge dalla stringa senza conversioni di fuso
  const iso = f.match_date ?? "";
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16) === "00:00" ? "" : iso.slice(11, 16),
    matchday: f.matchday != null ? String(f.matchday) : "",
    group_name: f.group_name ?? "",
    round: f.round ?? "",
    home_team: f.home_team,
    away_team: f.away_team,
    home_score: f.home_score != null ? String(f.home_score) : "",
    away_score: f.away_score != null ? String(f.away_score) : "",
    status: f.status,
  };
}

const sameDraft = (a: Draft, b: Draft) => (Object.keys(a) as (keyof Draft)[]).every((k) => a[k] === b[k]);
const toInt = (v: string) => (v.trim() === "" ? null : parseInt(v, 10));

function draftFields(d: Draft, groupFormat: boolean) {
  return {
    match_date: d.date ? `${d.date}T${d.time || "00:00"}:00` : null,
    matchday: toInt(d.matchday),
    group_name: groupFormat && d.group_name ? d.group_name : null,
    home_team: d.home_team.trim(),
    away_team: d.away_team.trim(),
    home_score: toInt(d.home_score),
    away_score: toInt(d.away_score),
    // Con entrambi i gol inseriti la partita è terminata, salvo scelta esplicita "In corso"
    status: d.status === "scheduled" && d.home_score !== "" && d.away_score !== "" ? "finished" : d.status,
  };
}

const input = "border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white";

export default function AdminRisultati() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [compId, setCompId] = useState("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [groupFilter, setGroupFilter] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const comp = competitions.find((c) => c.id === compId) ?? null;
  const groupFormat = isGroupFormat(comp?.format);

  useEffect(() => {
    supabase
      .from("competitions")
      .select("id, name, format, status")
      .then(({ data }) => {
        const list = (data as Competition[]) ?? [];
        const order: Record<string, number> = { attiva: 0, in_arrivo: 1, conclusa: 2 };
        list.sort((a, b) => (order[a.status ?? ""] ?? 1) - (order[b.status ?? ""] ?? 1) || a.name.localeCompare(b.name));
        setCompetitions(list);
        if (list[0]) setCompId(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (compId) fetchCompetition(compId);
    setGroupFilter("");
    setForm(emptyDraft);
    setMsg("");
  }, [compId]);

  async function fetchCompetition(id: string) {
    const [{ data: r }, { data: m }, { data: s }] = await Promise.all([
      supabase.from("competition_results").select("id, match_date, matchday, group_name, round, home_team, away_team, home_score, away_score, status").eq("competition_id", id),
      supabase.from("matches").select("id, match_date, matchday, group_name, home_team, away_team, is_home, home_score, away_score, status").eq("competition_id", id),
      supabase.from("standings").select("id, team_name, group_name").eq("competition_id", id),
    ]);
    const list = sortFixtures([
      ...((r as Omit<Fixture, "source">[]) ?? []).map((x) => ({ ...x, source: "result" as const })),
      ...((m as Parameters<typeof fixtureFromMatch>[0][]) ?? []).map(fixtureFromMatch),
    ]);
    setFixtures(list);
    setStandings((s as StandingRow[]) ?? []);
    setDrafts(Object.fromEntries(list.map((f) => [rowKey(f), toDraft(f)])));
  }

  const teams = useMemo(() => {
    const names = new Map<string, string>();
    for (const n of [VCH_NAME, ...standings.map((s) => s.team_name), ...fixtures.flatMap((f) => [f.home_team, f.away_team])]) {
      if (n && !names.has(teamKey(n))) names.set(teamKey(n), n.trim());
    }
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }, [standings, fixtures]);

  const visible = fixtures.filter((f) => !groupFilter || f.group_name === groupFilter);
  const byMatchday = useMemo(() => {
    const out: { label: string; rows: Fixture[] }[] = [];
    for (const f of visible) {
      const label = f.round || matchdayLabel(f.matchday) || "Senza giornata";
      let g = out.find((x) => x.label === label);
      if (!g) { g = { label, rows: [] }; out.push(g); }
      g.rows.push(f);
    }
    return out;
  }, [visible]);

  const dirtyKeys = fixtures.map(rowKey).filter((k) => {
    const f = fixtures.find((x) => rowKey(x) === k)!;
    return drafts[k] && !sameDraft(drafts[k], toDraft(f));
  });

  function setDraft(key: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  function swap(d: Draft): Partial<Draft> {
    return { home_team: d.away_team, away_team: d.home_team, home_score: d.away_score, away_score: d.home_score };
  }

  async function saveRow(f: Fixture): Promise<string | null> {
    const d = drafts[rowKey(f)];
    const fields = draftFields(d, groupFormat);
    if (!fields.home_team || !fields.away_team) return "Inserisci entrambe le squadre";
    if (teamKey(fields.home_team) === teamKey(fields.away_team)) return "Le due squadre coincidono";

    if (f.source === "match") {
      const vch = fixtureToMatchFields(fields);
      if (!vch) return `La partita del calendario Victoria deve avere la Victoria in campo (${fields.home_team} – ${fields.away_team})`;
      const { error } = await supabase.from("matches").update({
        match_date: fields.match_date ?? f.match_date,
        matchday: fields.matchday,
        group_name: fields.group_name,
        status: fields.status,
        ...vch,
      }).eq("id", f.id);
      return error?.message ?? null;
    }
    const { error } = await supabase.from("competition_results").update({ ...fields, round: d.round.trim() || null }).eq("id", f.id);
    return error?.message ?? null;
  }

  async function saveKeys(keys: string[]) {
    setBusy(true);
    setMsg("");
    const errors: string[] = [];
    for (const k of keys) {
      const f = fixtures.find((x) => rowKey(x) === k);
      if (!f) continue;
      const err = await saveRow(f);
      if (err) errors.push(err);
    }
    const sync = await syncStandings(compId);
    setMsg(errors.length ? "Errore: " + errors.join(" · ") : (keys.length > 1 ? `${keys.length} partite salvate!` : "Partita salvata!") + syncMessage(sync));
    await fetchCompetition(compId);
    setBusy(false);
  }

  async function removeRow(f: Fixture) {
    const what = f.source === "match"
      ? "Questa partita è nel calendario della Victoria: verrà eliminata anche da lì (con eventi e presenze collegate). Continuare?"
      : "Eliminare questa partita?";
    if (!confirm(what)) return;
    const { error } = await supabase.from(f.source === "match" ? "matches" : "competition_results").delete().eq("id", f.id);
    setMsg(error ? "Errore: " + error.message : "Partita eliminata." + syncMessage(await syncStandings(compId)));
    fetchCompetition(compId);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const fields = draftFields(form, groupFormat);
    if (teamKey(fields.home_team) === teamKey(fields.away_team)) { setMsg("Errore: le due squadre coincidono"); return; }
    setBusy(true);
    setMsg("");
    const vch = fixtureToMatchFields(fields);
    let error;
    if (vch) {
      // Partita della Victoria: va nel calendario, riusando il logo già noto dell'avversario
      const { data: known } = await supabase
        .from("matches").select("opponent_logo_url")
        .ilike("away_team", vch.away_team).not("opponent_logo_url", "is", null).limit(1);
      ({ error } = await supabase.from("matches").insert({
        competition_id: compId,
        match_date: fields.match_date,
        matchday: fields.matchday,
        group_name: fields.group_name,
        status: fields.status,
        opponent_logo_url: known?.[0]?.opponent_logo_url ?? null,
        ...vch,
      }));
    } else {
      ({ error } = await supabase.from("competition_results").insert({ ...fields, round: form.round.trim() || null, competition_id: compId }));
    }
    if (error) setMsg("Errore: " + error.message);
    else {
      const sync = await syncStandings(compId);
      setMsg((vch ? "Partita aggiunta anche al calendario Victoria!" : "Partita aggiunta!") + syncMessage(sync));
      // Tiene data, giornata e girone per inserire di seguito le altre partite della giornata
      setForm((f) => ({ ...f, home_team: "", away_team: "", home_score: "", away_score: "" }));
      fetchCompetition(compId);
    }
    setBusy(false);
  }

  async function recomputeStandings() {
    if (!comp) return;
    const finished = fixtures.filter((f) => f.status === "finished" && f.home_score != null && f.away_score != null);
    if (finished.length === 0) { setMsg("Nessuna partita terminata con risultato: classifica non modificata"); return; }
    if (!confirm(`Ricalcolare la classifica di "${comp.name}" da ${finished.length} partite terminate? I valori inseriti a mano verranno sovrascritti.`)) return;
    setBusy(true);
    const res = await syncStandings(comp.id, { force: true });
    setMsg(res.status === "error" ? "Errore: " + res.message : res.status === "updated" ? `Classifica aggiornata (${res.teams} squadre)` : "");
    await fetchCompetition(compId);
    setBusy(false);
  }

  const teamInput = (value: string, onChange: (v: string) => void, required = false, className = "") => (
    <input list="teams" required={required} className={`${input} ${className}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Squadra" />
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Admin – Risultati</h1>
      <p className="text-sm text-gray-500 mb-8">
        Tutte le partite di campionati e coppe, anche tra altre squadre. Le partite con la Victoria sono le stesse del calendario (pagina Partite).
      </p>

      <datalist id="teams">
        {teams.map((t) => <option key={t} value={t} />)}
      </datalist>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Competizione</label>
          <select className={`${input} min-w-[260px]`} value={compId} onChange={(e) => setCompId(e.target.value)}>
            {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {groupFormat && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Girone</label>
            <select className={input} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="">Tutti</option>
              {groupOptions.map((g) => <option key={g} value={g}>Girone {g}</option>)}
            </select>
          </div>
        )}
        <button onClick={recomputeStandings} disabled={busy || !comp} className="ml-auto text-xs bg-white border border-brand-blue text-brand-blue font-semibold px-4 py-2 rounded-full hover:bg-brand-blue hover:text-white transition disabled:opacity-50">
          📊 Ricalcola classifica dai risultati
        </button>
      </div>

      {/* NUOVA PARTITA */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Aggiungi partita{comp ? ` – ${comp.name}` : ""}</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data</label>
            <input type="date" className={`${input} w-full`} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Orario</label>
            <input type="time" className={`${input} w-full`} value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Giornata</label>
            <input type="number" min="1" className={`${input} w-full`} value={form.matchday} onChange={(e) => setForm((f) => ({ ...f, matchday: e.target.value }))} />
          </div>
          {groupFormat ? (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Girone</label>
              <select className={`${input} w-full`} value={form.group_name} onChange={(e) => setForm((f) => ({ ...f, group_name: e.target.value }))}>
                <option value="">– Fase finale –</option>
                {groupOptions.map((g) => <option key={g} value={g}>Girone {g}</option>)}
              </select>
            </div>
          ) : <div />}

          <div className="col-span-2 sm:col-span-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Squadra di casa *</label>
              <div className="flex gap-2">
                {teamInput(form.home_team, (v) => setForm((f) => ({ ...f, home_team: v })), true, "flex-1 min-w-0")}
                <input type="number" min="0" className={`${input} w-14 text-center`} value={form.home_score} onChange={(e) => setForm((f) => ({ ...f, home_score: e.target.value }))} placeholder="–" aria-label="Gol casa" />
              </div>
            </div>
            <button type="button" title="Inverti casa e trasferta" onClick={() => setForm((f) => ({ ...f, ...swap(f) }))} className="mb-1 text-gray-500 hover:text-brand-blue px-2 py-1 rounded-full hover:bg-gray-100">⇄</button>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Squadra in trasferta *</label>
              <div className="flex gap-2">
                <input type="number" min="0" className={`${input} w-14 text-center`} value={form.away_score} onChange={(e) => setForm((f) => ({ ...f, away_score: e.target.value }))} placeholder="–" aria-label="Gol trasferta" />
                {teamInput(form.away_team, (v) => setForm((f) => ({ ...f, away_team: v })), true, "flex-1 min-w-0")}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Stato</label>
            <select className={`${input} w-full`} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="scheduled">Da giocare</option>
              <option value="live">In corso</option>
              <option value="finished">Terminata</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Turno coppa</label>
            <input className={`${input} w-full`} value={form.round} onChange={(e) => setForm((f) => ({ ...f, round: e.target.value }))} placeholder="es. Semifinale" list="rounds" />
          </div>
          <div className="col-span-2 flex items-end">
            <button type="submit" disabled={busy || !compId} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {busy ? "Salvataggio..." : "Aggiungi partita"}
            </button>
          </div>
        </form>
        <datalist id="rounds">
          {["Ottavi di finale", "Quarti di finale", "Semifinale", "Finale 3°/4° posto", "Finale"].map((r) => <option key={r} value={r} />)}
        </datalist>
        <p className="text-xs text-gray-400 mt-3">
          Se una delle due squadre è la Victoria, la partita viene aggiunta al calendario della Victoria. Il turno coppa va indicato solo per la fase a eliminazione diretta: quelle partite non contano in classifica.
        </p>
      </div>

      {msg && <p className={`text-sm mb-4 ${msg.startsWith("Errore") ? "text-red-600" : "text-green-600"}`}>{msg}</p>}

      {dirtyKeys.length > 0 && (
        <div className="sticky top-28 z-30 mb-4 flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-sm">
          <span>{dirtyKeys.length} {dirtyKeys.length === 1 ? "partita modificata" : "partite modificate"} da salvare</span>
          <div className="flex gap-2">
            <button onClick={() => fetchCompetition(compId)} className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1">Annulla</button>
            <button onClick={() => saveKeys(dirtyKeys)} disabled={busy} className="text-xs bg-brand-blue text-white font-semibold px-4 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50">
              Salva tutto
            </button>
          </div>
        </div>
      )}

      {/* ELENCO PER GIORNATA */}
      {byMatchday.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">Nessuna partita inserita per questa competizione.</p>
      )}
      <div className="flex flex-col gap-6">
        {byMatchday.map((g) => (
          <section key={g.label}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">{g.label}</h3>
            <div className="flex flex-col gap-2">
              {g.rows.map((f) => {
                const k = rowKey(f);
                const d = drafts[k];
                if (!d) return null;
                const dirty = !sameDraft(d, toDraft(f));
                const vchRow = f.source === "match";
                return (
                  <div key={k} className={`bg-white border rounded-2xl p-3 shadow-sm ${dirty ? "border-yellow-300" : vchRow ? "border-brand-blue/30" : "border-gray-100"}`}>
                    <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
                      {teamInput(d.home_team, (v) => setDraft(k, { home_team: v }), true, `min-w-0 text-right ${isVCH(d.home_team) ? "font-bold text-brand-blue" : ""}`)}
                      <input type="number" min="0" className={`${input} w-12 text-center font-bold`} value={d.home_score} onChange={(e) => setDraft(k, { home_score: e.target.value })} placeholder="–" aria-label="Gol casa" />
                      <button type="button" title="Inverti casa e trasferta" onClick={() => setDraft(k, swap(d))} className="text-gray-400 hover:text-brand-blue px-1.5 py-1 rounded-full hover:bg-gray-100">⇄</button>
                      <input type="number" min="0" className={`${input} w-12 text-center font-bold`} value={d.away_score} onChange={(e) => setDraft(k, { away_score: e.target.value })} placeholder="–" aria-label="Gol trasferta" />
                      {teamInput(d.away_team, (v) => setDraft(k, { away_team: v }), true, `min-w-0 ${isVCH(d.away_team) ? "font-bold text-brand-blue" : ""}`)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <input type="date" className={`${input} text-xs`} value={d.date} onChange={(e) => setDraft(k, { date: e.target.value })} aria-label="Data" />
                      <input type="time" className={`${input} text-xs`} value={d.time} onChange={(e) => setDraft(k, { time: e.target.value })} aria-label="Orario" />
                      <input type="number" min="1" className={`${input} text-xs w-16`} value={d.matchday} onChange={(e) => setDraft(k, { matchday: e.target.value })} placeholder="Giorn." aria-label="Giornata" />
                      {groupFormat && (
                        <select className={`${input} text-xs`} value={d.group_name} onChange={(e) => setDraft(k, { group_name: e.target.value })} aria-label="Girone">
                          <option value="">Fase finale</option>
                          {groupOptions.map((x) => <option key={x} value={x}>Girone {x}</option>)}
                        </select>
                      )}
                      {!vchRow && (
                        <input className={`${input} text-xs w-32`} value={d.round} onChange={(e) => setDraft(k, { round: e.target.value })} placeholder="Turno coppa" list="rounds" aria-label="Turno coppa" />
                      )}
                      <select className={`${input} text-xs`} value={d.status} onChange={(e) => setDraft(k, { status: e.target.value })} aria-label="Stato">
                        <option value="scheduled">Da giocare</option>
                        <option value="live">In corso</option>
                        <option value="finished">Terminata</option>
                      </select>
                      {vchRow && <span className="text-[11px] bg-brand-blue/10 text-brand-blue font-semibold px-2 py-0.5 rounded-full">Calendario VCH</span>}
                      <div className="ml-auto flex items-center gap-2">
                        {dirty && (
                          <button onClick={() => saveKeys([k])} disabled={busy} className="bg-brand-blue text-white font-semibold px-3 py-1 rounded-full hover:opacity-90 disabled:opacity-50">
                            Salva
                          </button>
                        )}
                        <button onClick={() => removeRow(f)} className="text-gray-400 hover:text-red-500 transition" title="Elimina">🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
