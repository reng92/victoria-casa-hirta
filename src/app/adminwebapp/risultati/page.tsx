"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Fixture,
  VCH_NAME,
  groupOptions,
  isGroupFormat,
  isVCH,
  matchdayLabel,
  roundOrder,
  teamKey,
} from "@/lib/competitions";
import { CompetitionInfo, FixtureFields, Seed, insertFixture, insertFixtures, loadCompetitionData, updateFixture } from "@/lib/fixtures-db";
import { expectedGroupMatches, groupEntrants, isPlaceholderName, planGroupFixtures, planKnockout } from "@/lib/schedule";
import { syncStandings, syncMessage } from "@/lib/standings";

interface CompetitionOption { id: string; name: string; status: string | null; }

/** Valori dei campi in modifica (stringhe, come negli input). */
interface Draft {
  date: string;
  time: string;
  matchday: string;
  group_name: string;
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  home_penalties: string;
  away_penalties: string;
  home_source: string;
  away_source: string;
}

const emptyDraft: Draft = {
  date: "", time: "", matchday: "", group_name: "", home_team: "", away_team: "",
  home_score: "", away_score: "", home_penalties: "", away_penalties: "", home_source: "", away_source: "",
};

const rowKey = (f: Fixture) => `${f.source}:${f.id}`;
const str = (v: number | null) => (v != null ? String(v) : "");

function toDraft(f: Fixture): Draft {
  // match_date è salvato come orario "da parete" in UTC: si legge dalla stringa senza conversioni di fuso
  const iso = f.match_date ?? "";
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16) === "00:00" ? "" : iso.slice(11, 16),
    matchday: str(f.matchday),
    group_name: f.group_name ?? "",
    home_team: f.home_team,
    away_team: f.away_team,
    home_score: str(f.home_score),
    away_score: str(f.away_score),
    home_penalties: str(f.home_penalties),
    away_penalties: str(f.away_penalties),
    home_source: f.home_source ?? "",
    away_source: f.away_source ?? "",
  };
}

const sameDraft = (a: Draft, b: Draft) => (Object.keys(a) as (keyof Draft)[]).every((k) => a[k] === b[k]);
const toInt = (v: string) => (v.trim() === "" ? null : parseInt(v, 10));

/** Campi da salvare: lo stato deriva dai gol (entrambi inseriti = terminata), salvo partita in corso. */
function draftToFields(d: Draft, base: Pick<Fixture, "round" | "bracket_slot" | "status">, groupFormat: boolean): FixtureFields {
  const home_score = toInt(d.home_score);
  const away_score = toInt(d.away_score);
  const scored = home_score != null && away_score != null;
  const draw = scored && home_score === away_score;
  return {
    match_date: d.date ? `${d.date}T${d.time || "00:00"}:00` : null,
    matchday: base.round ? null : toInt(d.matchday),
    group_name: groupFormat && !base.round && d.group_name ? d.group_name : null,
    round: base.round,
    bracket_slot: base.bracket_slot,
    home_team: d.home_team.trim(),
    away_team: d.away_team.trim(),
    home_score,
    away_score,
    home_penalties: base.round && draw ? toInt(d.home_penalties) : null,
    away_penalties: base.round && draw ? toInt(d.away_penalties) : null,
    home_source: d.home_source || null,
    away_source: d.away_source || null,
    status: base.status === "live" ? "live" : scored ? "finished" : "scheduled",
  };
}

function swapDraft(d: Draft): Partial<Draft> {
  return {
    home_team: d.away_team, away_team: d.home_team,
    home_score: d.away_score, away_score: d.home_score,
    home_penalties: d.away_penalties, away_penalties: d.home_penalties,
    home_source: d.away_source, away_source: d.home_source,
  };
}

const input = "border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white";
const btnPrimary = "bg-brand-blue text-white font-semibold px-4 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50 text-sm";
const btnGhost = "bg-white border border-brand-blue text-brand-blue font-semibold px-4 py-2 rounded-full hover:bg-brand-blue hover:text-white transition disabled:opacity-50 text-sm";

export default function AdminRisultati() {
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [compId, setCompId] = useState("");
  const [comp, setComp] = useState<CompetitionInfo | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [tab, setTab] = useState("");
  const [onlyToPlay, setOnlyToPlay] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newTeam, setNewTeam] = useState({ name: "", group: "A" });
  const [form, setForm] = useState<Draft>(emptyDraft);
  const [formRound, setFormRound] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const format = comp?.format ?? null;
  const groupFormat = isGroupFormat(format);
  const hasKnockout = groupFormat || format === "eliminazione_diretta";
  const hasLeague = format !== "eliminazione_diretta";
  const legs = (comp?.legs ?? 1) as 1 | 2;

  useEffect(() => {
    supabase
      .from("competitions")
      .select("id, name, status")
      .then(({ data }) => {
        const list = (data as CompetitionOption[]) ?? [];
        const order: Record<string, number> = { attiva: 0, in_arrivo: 1, conclusa: 2 };
        list.sort((a, b) => (order[a.status ?? ""] ?? 1) - (order[b.status ?? ""] ?? 1) || a.name.localeCompare(b.name));
        setCompetitions(list);
        if (list[0]) setCompId(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!compId) return;
    setTab("");
    setExpanded(null);
    setForm(emptyDraft);
    setMsg("");
    load(compId, true);
  }, [compId]);

  async function load(id: string, pickTab = false) {
    const data = await loadCompetitionData(id);
    setComp(data.competition);
    setFixtures(data.fixtures);
    setSeeds(data.seeds);
    setDrafts(Object.fromEntries(data.fixtures.map((f) => [rowKey(f), toDraft(f)])));
    if (pickTab) {
      // Si apre sulla prima sezione con partite ancora da giocare
      const firstOpen = data.fixtures.find((f) => f.status !== "finished");
      setTab(firstOpen ? sectionOf(firstOpen) : "");
    }
  }

  /* ---------------- Sezioni (gironi / fase finale) ---------------- */

  const groups = useMemo(() => {
    const names = new Set<string>();
    for (const s of seeds) if (s.group_name) names.add(s.group_name);
    for (const f of fixtures) if (f.group_name && !f.round) names.add(f.group_name);
    return [...names].sort();
  }, [seeds, fixtures]);

  function sectionOf(f: Fixture) {
    if (f.round) return "ko";
    return f.group_name ? `g:${f.group_name}` : "league";
  }

  const sections = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    if (groupFormat) for (const g of groups) out.push({ key: `g:${g}`, label: `Girone ${g}` });
    else if (hasLeague) out.push({ key: "league", label: "Giornate" });
    if (hasKnockout || fixtures.some((f) => f.round)) out.push({ key: "ko", label: "Fase finale" });
    if (fixtures.some((f) => !f.round && !f.group_name) && groupFormat) out.push({ key: "league", label: "Senza girone" });
    return out;
  }, [groupFormat, hasLeague, hasKnockout, groups, fixtures]);

  const activeTab = sections.some((s) => s.key === tab) ? tab : sections[0]?.key ?? "";

  const visible = fixtures.filter((f) => sectionOf(f) === activeTab && (!onlyToPlay || f.status !== "finished"));
  const blocks = useMemo(() => {
    const out: { label: string; rows: Fixture[] }[] = [];
    for (const f of visible) {
      const label = f.round || matchdayLabel(f.matchday) || "Senza giornata";
      let g = out.find((x) => x.label === label);
      if (!g) { g = { label, rows: [] }; out.push(g); }
      g.rows.push(f);
    }
    return out;
  }, [visible]);

  /* ---------------- Stato del calendario ---------------- */

  const leagueBuckets = useMemo(() => {
    if (!hasLeague) return [];
    const keys: (string | null)[] = groupFormat ? groups : [null];
    return keys.map((g) => {
      const teams = seeds.filter((s) => (s.group_name ?? null) === g).map((s) => s.team_name);
      const existing = fixtures.filter((f) => !f.round && (f.group_name ?? null) === g);
      const missing = teams.length >= 2 ? planGroupFixtures(teams, existing, legs) : [];
      return { group: g, teams, existing: existing.length, expected: expectedGroupMatches(teams.length, legs), missing };
    });
  }, [hasLeague, groupFormat, groups, seeds, fixtures, legs]);

  const missingCount = leagueBuckets.reduce((n, b) => n + b.missing.length, 0);
  const knockoutFixtures = fixtures.filter((f) => f.round);
  const knockoutPlayed = knockoutFixtures.some((f) => f.home_score != null);
  const entrants = useMemo(() => {
    if (groupFormat) return groupEntrants(groups, comp?.qualified_per_group ?? 2);
    return seeds.map((s) => ({ team: s.team_name, source: null }));
  }, [groupFormat, groups, comp?.qualified_per_group, seeds]);
  const plannedBracket = useMemo(() => planKnockout(entrants), [entrants]);
  const bracketRounds = [...new Set(plannedBracket.map((t) => t.round))];

  const teamsList = useMemo(() => {
    const names = new Map<string, string>();
    for (const n of [VCH_NAME, ...seeds.map((s) => s.team_name)]) if (n && !names.has(teamKey(n))) names.set(teamKey(n), n.trim());
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }, [seeds]);

  const dirtyKeys = fixtures.filter((f) => drafts[rowKey(f)] && !sameDraft(drafts[rowKey(f)], toDraft(f))).map(rowKey);

  /* ---------------- Azioni ---------------- */

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setMsg("");
    try {
      setMsg(await action());
    } catch (e) {
      setMsg("Errore: " + (e instanceof Error ? e.message : String(e)));
    }
    await load(compId);
    setBusy(false);
  }

  async function saveSettings(patch: Partial<Pick<CompetitionInfo, "legs" | "qualified_per_group">>) {
    if (!comp) return;
    await run(async () => {
      const { error } = await supabase.from("competitions").update(patch).eq("id", comp.id);
      return error ? "Errore: " + error.message : "Formula aggiornata.";
    });
  }

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    const name = newTeam.name.trim();
    if (!name) return;
    if (seeds.some((s) => teamKey(s.team_name) === teamKey(name))) { setMsg("Errore: squadra già presente"); return; }
    await run(async () => {
      const { error } = await supabase.from("standings").insert({
        competition_id: compId,
        team_name: name,
        group_name: groupFormat ? newTeam.group : null,
      });
      if (error) return "Errore: " + error.message;
      setNewTeam((t) => ({ ...t, name: "" }));
      return `${name} aggiunta.`;
    });
  }

  async function removeTeam(s: Seed) {
    const used = fixtures.filter((f) => teamKey(f.home_team) === teamKey(s.team_name) || teamKey(f.away_team) === teamKey(s.team_name)).length;
    const warn = used ? ` Ha ${used} partite in calendario: resteranno, eliminale a mano se serve.` : "";
    if (!confirm(`Togliere ${s.team_name} dalla competizione?${warn}`)) return;
    await run(async () => {
      const { error } = await supabase.from("standings").delete().eq("id", s.id);
      return error ? "Errore: " + error.message : `${s.team_name} rimossa.`;
    });
  }

  async function generateLeague() {
    const rows: FixtureFields[] = leagueBuckets.flatMap((b) =>
      b.missing.map((p) => ({
        match_date: null, matchday: p.matchday, group_name: b.group, round: null, bracket_slot: null,
        home_team: p.home_team, away_team: p.away_team, home_score: null, away_score: null,
        home_penalties: null, away_penalties: null, home_source: null, away_source: null, status: "scheduled",
      })),
    );
    if (!rows.length) return;
    await run(async () => {
      const err = await insertFixtures(compId, rows);
      if (err) return "Errore: " + err;
      return `${rows.length} partite generate. Inverti casa/trasferta dove serve e aggiungi date e risultati.` + syncMessage(await syncStandings(compId));
    });
  }

  async function generateBracket() {
    if (knockoutFixtures.length) {
      if (knockoutPlayed) { setMsg("Errore: la fase finale ha già dei risultati, non si può rigenerare."); return; }
      if (!confirm("Il tabellone esistente verrà sostituito. Continuare?")) return;
    }
    await run(async () => {
      for (const f of knockoutFixtures) {
        const { error } = await supabase.from(f.source === "match" ? "matches" : "competition_results").delete().eq("id", f.id);
        if (error) return "Errore: " + error.message;
      }
      const rows: FixtureFields[] = plannedBracket.map((t) => ({
        ...t, match_date: null, matchday: null, group_name: null,
        home_score: null, away_score: null, home_penalties: null, away_penalties: null, status: "scheduled",
      }));
      const err = await insertFixtures(compId, rows);
      if (err) return "Errore: " + err;
      return `Tabellone generato (${bracketRounds.join(", ")}). Le squadre si inseriscono da sole quando i gironi finiscono.` + syncMessage(await syncStandings(compId));
    });
  }

  function setDraft(key: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  /** Cambiare a mano il nome di una squadra del tabellone la "fissa": non verrà più ricalcolata. */
  function setTeamName(key: string, side: "home" | "away", value: string) {
    setDraft(key, side === "home" ? { home_team: value, home_source: "" } : { away_team: value, away_source: "" });
  }

  async function saveRow(f: Fixture): Promise<string | null> {
    const fields = draftToFields(drafts[rowKey(f)], f, groupFormat);
    if (!fields.home_team || !fields.away_team) return "Inserisci entrambe le squadre";
    if (teamKey(fields.home_team) === teamKey(fields.away_team)) return "Le due squadre coincidono";
    const placeholder = isPlaceholderName(fields.home_team, fields.home_source) || isPlaceholderName(fields.away_team, fields.away_source);
    if (placeholder && fields.home_score != null) return `${fields.home_team} – ${fields.away_team}: le squadre non sono ancora definite`;
    const vch = isVCH(fields.home_team) || isVCH(fields.away_team);
    if (vch && fields.status === "finished" && !fields.match_date) return "Per le partite della Victoria serve la data, così finiscono anche nel calendario";
    return updateFixture(compId, f, fields);
  }

  async function saveKeys(keys: string[]) {
    await run(async () => {
      const errors: string[] = [];
      for (const k of keys) {
        const f = fixtures.find((x) => rowKey(x) === k);
        if (!f) continue;
        const err = await saveRow(f);
        if (err) errors.push(err);
      }
      const sync = await syncStandings(compId);
      if (errors.length) return "Errore: " + errors.join(" · ");
      return (keys.length > 1 ? `${keys.length} partite salvate!` : "Partita salvata!") + syncMessage(sync);
    });
  }

  async function removeRow(f: Fixture) {
    const what = f.source === "match"
      ? "Questa partita è nel calendario della Victoria: verrà eliminata anche da lì (con eventi e presenze collegate). Continuare?"
      : "Eliminare questa partita?";
    if (!confirm(what)) return;
    await run(async () => {
      const { error } = await supabase.from(f.source === "match" ? "matches" : "competition_results").delete().eq("id", f.id);
      return error ? "Errore: " + error.message : "Partita eliminata." + syncMessage(await syncStandings(compId));
    });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const round = formRound.trim() || null;
    const fields = draftToFields(form, { round, bracket_slot: null, status: "scheduled" }, groupFormat);
    if (teamKey(fields.home_team) === teamKey(fields.away_team)) { setMsg("Errore: le due squadre coincidono"); return; }
    await run(async () => {
      const err = await insertFixture(compId, fields);
      if (err) return "Errore: " + err;
      // Tiene data, giornata e girone per inserire di seguito le altre partite della giornata
      setForm((f) => ({ ...f, home_team: "", away_team: "", home_score: "", away_score: "" }));
      return "Partita aggiunta!" + syncMessage(await syncStandings(compId));
    });
  }

  async function recomputeStandings() {
    if (!comp) return;
    if (!confirm(`Ricalcolare la classifica di "${comp.name}" dai risultati? I valori inseriti a mano verranno sovrascritti.`)) return;
    await run(async () => {
      const res = await syncStandings(comp.id, { force: true });
      return res.status === "error" ? "Errore: " + res.message : res.status === "updated" ? `Classifica aggiornata (${res.teams} squadre)` : "";
    });
  }

  /* ---------------- UI ---------------- */

  const played = fixtures.filter((f) => f.status === "finished").length;
  const seedsByGroup = (g: string | null) => seeds.filter((s) => (s.group_name ?? null) === g);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-1">Risultati e classifiche</h1>
      <p className="text-sm text-gray-500 mb-6">
        Scegli la competizione, controlla le squadre e genera il calendario: poi inserisci solo i risultati. Classifica e tabellone si aggiornano da soli.
      </p>

      <datalist id="teams">
        {teamsList.map((t) => <option key={t} value={t} />)}
      </datalist>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select className={`${input} min-w-[260px] py-2 font-semibold`} value={compId} onChange={(e) => setCompId(e.target.value)} aria-label="Competizione">
          {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {comp && (
          <span className="text-xs text-gray-500">
            {fixtures.length} partite · {played} giocate
          </span>
        )}
      </div>

      {msg && (
        <p className={`text-sm mb-4 rounded-xl px-4 py-2 ${msg.startsWith("Errore") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{msg}</p>
      )}

      {comp && (
        <>
          {/* 1. SQUADRE E FORMULA */}
          <details open={seeds.length === 0 || fixtures.length === 0} className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-4 group">
            <summary className="flex items-center justify-between gap-3 p-5 cursor-pointer list-none">
              <span className="font-bold text-brand-blue">
                <span className="inline-flex w-6 h-6 rounded-full bg-brand-blue text-white text-xs items-center justify-center mr-2">1</span>
                Squadre e formula
              </span>
              <span className="text-xs text-gray-500">{seeds.length} squadre <span className="inline-block transition group-open:rotate-180">▾</span></span>
            </summary>
            <div className="px-5 pb-5 flex flex-col gap-4">
              <div className="flex flex-wrap gap-4 text-sm">
                {hasLeague && (
                  <label className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">{groupFormat ? "Gironi" : "Campionato"}</span>
                    <select className={input} value={legs} disabled={busy} onChange={(e) => saveSettings({ legs: Number(e.target.value) })}>
                      <option value={1}>Solo andata</option>
                      <option value={2}>Andata e ritorno</option>
                    </select>
                  </label>
                )}
                {groupFormat && (
                  <label className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">Passano alla fase finale</span>
                    <select className={input} value={comp.qualified_per_group} disabled={busy} onChange={(e) => saveSettings({ qualified_per_group: Number(e.target.value) })}>
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>le prime {n} di ogni girone</option>)}
                    </select>
                  </label>
                )}
              </div>

              <div className={`grid gap-3 ${groupFormat ? "sm:grid-cols-2" : ""}`}>
                {(groupFormat ? (groups.length ? groups : ["A"]) : [null]).map((g) => (
                  <div key={g ?? "all"} className="border border-gray-100 rounded-xl p-3">
                    {g && <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Girone {g}</p>}
                    <ul className="flex flex-wrap gap-1.5">
                      {seedsByGroup(g).map((s) => (
                        <li key={s.id} className={`inline-flex items-center gap-1 text-xs rounded-full pl-3 pr-1 py-1 ${isVCH(s.team_name) ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-800"}`}>
                          {s.team_name}
                          <button type="button" onClick={() => removeTeam(s)} className="w-5 h-5 rounded-full hover:bg-black/10" aria-label={`Togli ${s.team_name}`}>×</button>
                        </li>
                      ))}
                      {seedsByGroup(g).length === 0 && <li className="text-xs text-gray-400">Nessuna squadra</li>}
                    </ul>
                  </div>
                ))}
              </div>

              <form onSubmit={addTeam} className="flex flex-wrap gap-2">
                <input list="teams" className={`${input} flex-1 min-w-[180px]`} value={newTeam.name} onChange={(e) => setNewTeam((t) => ({ ...t, name: e.target.value }))} placeholder="Aggiungi squadra" />
                {groupFormat && (
                  <select className={input} value={newTeam.group} onChange={(e) => setNewTeam((t) => ({ ...t, group: e.target.value }))} aria-label="Girone">
                    {groupOptions.map((g) => <option key={g} value={g}>Girone {g}</option>)}
                  </select>
                )}
                <button type="submit" disabled={busy || !newTeam.name.trim()} className={btnGhost}>Aggiungi</button>
              </form>
            </div>
          </details>

          {/* 2. CALENDARIO */}
          <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
            <h2 className="font-bold text-brand-blue mb-3">
              <span className="inline-flex w-6 h-6 rounded-full bg-brand-blue text-white text-xs items-center justify-center mr-2">2</span>
              Calendario
            </h2>
            <div className="flex flex-col gap-3 text-sm">
              {hasLeague && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold">{groupFormat ? "Gironi" : "Giornate"}</p>
                    <p className="text-xs text-gray-500">
                      {leagueBuckets.map((b) => `${b.group ? `Girone ${b.group}: ` : ""}${b.existing}/${b.expected} partite`).join(" · ") || "Aggiungi prima le squadre"}
                    </p>
                  </div>
                  {missingCount > 0 ? (
                    <button onClick={generateLeague} disabled={busy} className={btnPrimary}>Genera {missingCount} partite</button>
                  ) : (
                    leagueBuckets.some((b) => b.teams.length >= 2) && <span className="text-xs font-semibold text-green-700">✓ Calendario completo</span>
                  )}
                </div>
              )}
              {hasKnockout && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold">Fase finale</p>
                    <p className="text-xs text-gray-500">
                      {knockoutFixtures.length
                        ? `${knockoutFixtures.length} partite: ${[...new Set(knockoutFixtures.map((f) => f.round!))].sort((a, b) => roundOrder(a) - roundOrder(b)).join(", ")}`
                        : plannedBracket.length
                          ? `Da generare: ${bracketRounds.join(", ")}${groupFormat ? ` (${entrants.length} qualificate)` : ""}`
                          : "Servono almeno 2 squadre"}
                    </p>
                  </div>
                  {plannedBracket.length > 0 && !knockoutPlayed && (
                    <button onClick={generateBracket} disabled={busy} className={knockoutFixtures.length ? btnGhost : btnPrimary}>
                      {knockoutFixtures.length ? "Rigenera tabellone" : "Genera tabellone"}
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400">
                Le partite generate non hanno data: aggiungila quando la conosci. Quelle della Victoria entrano nel calendario del sito appena hanno una data.
                {groupFormat && " Nel tabellone le qualificate e le vincenti compaiono da sole a fine girone e dopo ogni turno."}
              </p>
            </div>
          </section>

          {/* 3. RISULTATI */}
          {fixtures.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {sections.length > 1 && sections.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setTab(s.key)}
                    className={`text-sm font-semibold px-4 py-1.5 rounded-full transition ${activeTab === s.key ? "bg-brand-blue text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-brand-blue"}`}
                  >
                    {s.label}
                  </button>
                ))}
                <label className="ml-auto flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={onlyToPlay} onChange={(e) => setOnlyToPlay(e.target.checked)} />
                  Solo da giocare
                </label>
              </div>

              {dirtyKeys.length > 0 && (
                <div className="sticky top-28 z-30 mb-4 flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-sm shadow-sm">
                  <span>{dirtyKeys.length} {dirtyKeys.length === 1 ? "partita modificata" : "partite modificate"}</span>
                  <div className="flex gap-2">
                    <button onClick={() => load(compId)} className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1">Annulla</button>
                    <button onClick={() => saveKeys(dirtyKeys)} disabled={busy} className="text-xs bg-brand-blue text-white font-semibold px-4 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50">
                      Salva tutto
                    </button>
                  </div>
                </div>
              )}

              {blocks.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-10">{onlyToPlay ? "Tutte le partite di questa sezione sono state giocate." : "Nessuna partita in questa sezione."}</p>
              )}

              <div className="flex flex-col gap-6">
                {blocks.map((b) => (
                  <section key={b.label}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">{b.label}</h3>
                    <div className="flex flex-col gap-2">
                      {b.rows.map((f) => (
                        <FixtureRow
                          key={rowKey(f)}
                          f={f}
                          d={drafts[rowKey(f)]}
                          groupFormat={groupFormat}
                          busy={busy}
                          open={expanded === rowKey(f)}
                          onToggle={() => setExpanded((x) => (x === rowKey(f) ? null : rowKey(f)))}
                          onChange={(patch) => setDraft(rowKey(f), patch)}
                          onTeam={(side, v) => setTeamName(rowKey(f), side, v)}
                          onSwap={() => setDraft(rowKey(f), swapDraft(drafts[rowKey(f)]))}
                          onSave={() => saveKeys([rowKey(f)])}
                          onDelete={() => removeRow(f)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          {/* AGGIUNTA MANUALE */}
          <details className="bg-white border border-gray-100 rounded-2xl shadow-sm mt-8 group">
            <summary className="flex items-center justify-between p-5 cursor-pointer list-none text-sm font-semibold text-gray-600">
              Aggiungi una partita a mano
              <span className="transition group-open:rotate-180">▾</span>
            </summary>
            <form onSubmit={handleAdd} className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    <option value="">–</option>
                    {groupOptions.map((g) => <option key={g} value={g}>Girone {g}</option>)}
                  </select>
                </div>
              ) : <div />}
              <div className="col-span-2 sm:col-span-4 grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
                <input list="teams" required className={`${input} min-w-0`} value={form.home_team} onChange={(e) => setForm((f) => ({ ...f, home_team: e.target.value }))} placeholder="Squadra di casa" />
                <input type="number" min="0" className={`${input} w-12 text-center`} value={form.home_score} onChange={(e) => setForm((f) => ({ ...f, home_score: e.target.value }))} placeholder="–" aria-label="Gol casa" />
                <button type="button" title="Inverti casa e trasferta" onClick={() => setForm((f) => ({ ...f, ...swapDraft(f) }))} className="text-gray-500 hover:text-brand-blue px-2 py-1 rounded-full hover:bg-gray-100">⇄</button>
                <input type="number" min="0" className={`${input} w-12 text-center`} value={form.away_score} onChange={(e) => setForm((f) => ({ ...f, away_score: e.target.value }))} placeholder="–" aria-label="Gol trasferta" />
                <input list="teams" required className={`${input} min-w-0`} value={form.away_team} onChange={(e) => setForm((f) => ({ ...f, away_team: e.target.value }))} placeholder="Squadra in trasferta" />
              </div>
              {hasKnockout && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Turno fase finale (vuoto se è una partita del girone)</label>
                  <input className={`${input} w-full`} value={formRound} onChange={(e) => setFormRound(e.target.value)} placeholder="es. Semifinale" list="rounds" />
                  <datalist id="rounds">
                    {["Ottavi di finale", "Quarti di finale", "Semifinale", "Finale 3°/4° posto", "Finale"].map((r) => <option key={r} value={r} />)}
                  </datalist>
                </div>
              )}
              <div className="col-span-2 flex items-end">
                <button type="submit" disabled={busy} className={btnPrimary}>Aggiungi partita</button>
              </div>
            </form>
          </details>

          <div className="mt-6 text-right">
            <button onClick={recomputeStandings} disabled={busy} className="text-xs text-gray-500 hover:text-brand-blue underline">
              Ricalcola la classifica da zero (sovrascrive i valori inseriti a mano)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function FixtureRow({
  f, d, groupFormat, busy, open, onToggle, onChange, onTeam, onSwap, onSave, onDelete,
}: {
  f: Fixture;
  d: Draft | undefined;
  groupFormat: boolean;
  busy: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onTeam: (side: "home" | "away", value: string) => void;
  onSwap: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  if (!d) return null;
  const dirty = !sameDraft(d, toDraft(f));
  const finished = d.home_score !== "" && d.away_score !== "";
  const draw = finished && d.home_score === d.away_score;
  const vch = isVCH(d.home_team) || isVCH(d.away_team);
  const tbd = isPlaceholderName(d.home_team, d.home_source) || isPlaceholderName(d.away_team, d.away_source);

  const name = (team: string, source: string, align: string) => (
    <span className={`min-w-0 truncate text-sm ${align} ${isPlaceholderName(team, source) ? "italic text-gray-400" : isVCH(team) ? "font-bold text-brand-blue" : "font-medium"}`} title={team}>
      {team}
    </span>
  );
  const score = (key: "home_score" | "away_score", label: string) => (
    <input
      type="number" inputMode="numeric" min="0" disabled={tbd}
      className={`${input} w-11 h-10 text-center text-base font-bold disabled:bg-gray-50`}
      value={d[key]} onChange={(e) => onChange({ [key]: e.target.value })} placeholder="–" aria-label={label}
    />
  );

  return (
    <div className={`bg-white border rounded-2xl p-3 shadow-sm ${dirty ? "border-yellow-300 bg-yellow-50/30" : finished ? "border-gray-100" : "border-gray-200"}`}>
      <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-1.5 sm:gap-2">
        {name(d.home_team, d.home_source, "text-right")}
        {score("home_score", `Gol ${d.home_team}`)}
        <button type="button" title="Inverti casa e trasferta" onClick={onSwap} className="text-gray-400 hover:text-brand-blue w-8 h-8 rounded-full hover:bg-gray-100">⇄</button>
        {score("away_score", `Gol ${d.away_team}`)}
        {name(d.away_team, d.away_source, "text-left")}
      </div>

      {f.round && draw && (
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500">
          Rigori
          <input type="number" inputMode="numeric" min="0" className={`${input} w-11 text-center`} value={d.home_penalties} onChange={(e) => onChange({ home_penalties: e.target.value })} aria-label="Rigori casa" />
          –
          <input type="number" inputMode="numeric" min="0" className={`${input} w-11 text-center`} value={d.away_penalties} onChange={(e) => onChange({ away_penalties: e.target.value })} aria-label="Rigori trasferta" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
        <input type="date" className={`${input} text-xs`} value={d.date} onChange={(e) => onChange({ date: e.target.value })} aria-label="Data" />
        <input type="time" className={`${input} text-xs`} value={d.time} onChange={(e) => onChange({ time: e.target.value })} aria-label="Orario" />
        {f.source === "match" && <span className="text-[11px] bg-brand-blue/10 text-brand-blue font-semibold px-2 py-0.5 rounded-full">Nel calendario VCH</span>}
        {f.source === "result" && vch && !tbd && <span className="text-[11px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Aggiungi la data per metterla nel calendario VCH</span>}
        {f.status === "live" && <span className="text-[11px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">In corso</span>}
        <div className="ml-auto flex items-center gap-1">
          {dirty && (
            <button onClick={onSave} disabled={busy} className="bg-brand-blue text-white font-semibold px-3 py-1 rounded-full hover:opacity-90 disabled:opacity-50">
              Salva
            </button>
          )}
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded-full hover:bg-gray-100" aria-expanded={open} title="Altre opzioni">⋯</button>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <label className="col-span-2 sm:col-span-2">
            <span className="text-gray-500 block mb-1">Squadra di casa</span>
            <input list="teams" className={`${input} w-full`} value={d.home_team} onChange={(e) => onTeam("home", e.target.value)} />
          </label>
          <label className="col-span-2 sm:col-span-2">
            <span className="text-gray-500 block mb-1">Squadra in trasferta</span>
            <input list="teams" className={`${input} w-full`} value={d.away_team} onChange={(e) => onTeam("away", e.target.value)} />
          </label>
          {!f.round && (
            <label>
              <span className="text-gray-500 block mb-1">Giornata</span>
              <input type="number" min="1" className={`${input} w-full`} value={d.matchday} onChange={(e) => onChange({ matchday: e.target.value })} />
            </label>
          )}
          {!f.round && groupFormat && (
            <label>
              <span className="text-gray-500 block mb-1">Girone</span>
              <select className={`${input} w-full`} value={d.group_name} onChange={(e) => onChange({ group_name: e.target.value })}>
                <option value="">–</option>
                {groupOptions.map((x) => <option key={x} value={x}>Girone {x}</option>)}
              </select>
            </label>
          )}
          <div className="col-span-2 sm:col-span-4 flex items-center justify-between gap-2 mt-1">
            <span className="text-gray-400">
              {f.round ? "Se cambi a mano una squadra del tabellone, non verrà più aggiornata in automatico." : ""}
            </span>
            <button onClick={onDelete} className="text-red-500 hover:text-red-700 font-semibold">Elimina partita</button>
          </div>
        </div>
      )}
    </div>
  );
}
