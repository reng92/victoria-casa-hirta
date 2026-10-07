"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { refreshPages } from "@/lib/revalidate";
import {
  formatRomeDateTime,
  isoToRomeLocal,
  monthLabel,
  pollStatus,
  romeLocalToIso,
  type MvpPoll,
} from "@/lib/mvp";

interface Player {
  id: string;
  full_name: string;
  shirt_number: number | null;
  role: string;
  photo_url: string | null;
  is_active: boolean;
}

interface Poll extends MvpPoll {
  mvp_candidates: { player_id: string }[];
}

const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm";
const statusLabel = { upcoming: "In arrivo", open: "Aperta", closed: "Chiusa" };
const statusClass = {
  upcoming: "bg-amber-100 text-amber-700",
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

/** Ora del server (Vercel), non quella del dispositivo dell'admin. */
async function serverNow() {
  try {
    const res = await fetch("/api/time", { cache: "no-store" });
    return ((await res.json()) as { now: number }).now;
  } catch {
    return Date.now();
  }
}

function currentMonth() {
  return isoToRomeLocal(new Date().toISOString()).slice(0, 7);
}

function defaultTitle(month: string) {
  return `MVP di ${monthLabel(`${month}-01`)}`;
}

function emptyForm() {
  const month = currentMonth();
  return { title: defaultTitle(month), month, opens_at: "", closes_at: "" };
}

export default function AdminMvp() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [results, setResults] = useState<Record<string, Record<string, number>>>({});
  const [form, setForm] = useState(emptyForm);
  const [titleTouched, setTitleTouched] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [romeNow, setRomeNow] = useState("");

  useEffect(() => {
    fetchPlayers();
    fetchPolls();
    let offset = 0;
    const started = Date.now();
    serverNow().then((s) => { offset = s + (Date.now() - started) / 2 - Date.now(); });
    const tick = () => {
      const d = new Date(Date.now() + offset);
      setRomeNow(d.toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  async function fetchPlayers() {
    const { data } = await supabase
      .from("players")
      .select("id, full_name, shirt_number, role, photo_url, is_active")
      .order("shirt_number", { ascending: true, nullsFirst: false });
    setPlayers((data as unknown as Player[]) ?? []);
  }

  async function fetchPolls() {
    const { data } = await supabase
      .from("mvp_polls")
      .select("id, title, month, opens_at, closes_at, mvp_candidates(player_id)")
      .order("month", { ascending: false })
      .order("opens_at", { ascending: false });
    const list = (data as unknown as Poll[]) ?? [];
    setPolls(list);
    const all = await Promise.all(list.map((p) => supabase.rpc("mvp_results", { p_poll: p.id })));
    const out: Record<string, Record<string, number>> = {};
    list.forEach((p, i) => {
      out[p.id] = {};
      for (const r of (all[i].data as { player_id: string; votes: number }[]) ?? []) out[p.id][r.player_id] = Number(r.votes);
    });
    setResults(out);
  }

  function toggle(id: string) {
    setCandidates((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  function resetForm() {
    setEditId(null);
    setForm(emptyForm());
    setTitleTouched(false);
    setCandidates([]);
  }

  function openEdit(p: Poll) {
    setEditId(p.id);
    setForm({
      title: p.title,
      month: p.month.slice(0, 7),
      opens_at: isoToRomeLocal(p.opens_at),
      closes_at: isoToRomeLocal(p.closes_at),
    });
    setTitleTouched(true);
    setCandidates(p.mvp_candidates.map((c) => c.player_id));
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (candidates.length < 2) {
      setMsg({ ok: false, text: "Scegli almeno 2 candidati." });
      return;
    }
    const opens = romeLocalToIso(form.opens_at);
    const closes = romeLocalToIso(form.closes_at);
    if (Date.parse(closes) <= Date.parse(opens)) {
      setMsg({ ok: false, text: "La chiusura deve essere dopo l'apertura." });
      return;
    }

    const existing = editId ? polls.find((p) => p.id === editId) : null;
    const removed = existing ? existing.mvp_candidates.map((c) => c.player_id).filter((id) => !candidates.includes(id)) : [];
    const lostVotes = removed.reduce((sum, id) => sum + (results[editId ?? ""]?.[id] ?? 0), 0);
    if (lostVotes > 0 && !confirm(`Togliendo questi candidati si cancellano ${lostVotes} voti già ricevuti. Continuare?`)) return;

    setLoading(true);
    const fields = { title: form.title.trim(), month: `${form.month}-01`, opens_at: opens, closes_at: closes };
    let pollId = editId;
    if (editId) {
      const { error } = await supabase.from("mvp_polls").update(fields).eq("id", editId);
      if (error) { setMsg({ ok: false, text: "Errore: " + error.message }); setLoading(false); return; }
      if (removed.length) await supabase.from("mvp_candidates").delete().eq("poll_id", editId).in("player_id", removed);
    } else {
      const { data, error } = await supabase.from("mvp_polls").insert(fields).select("id").single();
      if (error || !data) { setMsg({ ok: false, text: "Errore: " + (error?.message ?? "salvataggio non riuscito") }); setLoading(false); return; }
      pollId = (data as { id: string }).id;
    }
    const { error: candError } = await supabase
      .from("mvp_candidates")
      .upsert(candidates.map((player_id) => ({ poll_id: pollId, player_id })), { onConflict: "poll_id,player_id", ignoreDuplicates: true });
    if (candError) setMsg({ ok: false, text: "Errore sui candidati: " + candError.message });
    else {
      setMsg({ ok: true, text: editId ? "Votazione aggiornata!" : "Votazione creata!" });
      resetForm();
    }
    await fetchPolls();
    refreshPages(["/", "/mvp"]);
    setLoading(false);
  }

  async function setNow(p: Poll, field: "opens_at" | "closes_at") {
    const label = field === "opens_at" ? "Aprire subito" : "Chiudere subito";
    if (!confirm(`${label} la votazione "${p.title}"?`)) return;
    const now = new Date(await serverNow()).toISOString();
    const patch = field === "opens_at" && Date.parse(p.closes_at) <= Date.parse(now)
      ? { opens_at: now, closes_at: new Date(Date.parse(now) + 7 * 86400000).toISOString() }
      : { [field]: now };
    const { error } = await supabase.from("mvp_polls").update(patch).eq("id", p.id);
    if (error) setMsg({ ok: false, text: "Errore: " + error.message });
    await fetchPolls();
    refreshPages(["/", "/mvp"]);
  }

  async function handleDelete(p: Poll) {
    if (!confirm(`Eliminare "${p.title}" con tutti i suoi voti?`)) return;
    await supabase.from("mvp_polls").delete().eq("id", p.id);
    if (editId === p.id) resetForm();
    await fetchPolls();
    refreshPages(["/", "/mvp"]);
  }

  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const selectable = players.filter((p) => p.is_active || candidates.includes(p.id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Admin – MVP del mese</h1>
      <p className="text-sm text-gray-500 mb-8">
        Ora di Roma adesso: <strong className="text-gray-800 tabular-nums">{romeNow}</strong>. Apertura e chiusura si inseriscono in ora italiana.
      </p>

      <div className={`bg-white rounded-2xl shadow-sm p-6 mb-10 ${editId ? "border-2 border-brand-blue" : "border border-gray-100"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-brand-blue">{editId ? "✏️ Modifica votazione" : "Nuova votazione"}</h2>
          {editId && <button onClick={resetForm} className="text-gray-400 hover:text-red-500 text-xl">✕</button>}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mese *</label>
            <input
              required
              type="month"
              className={input}
              value={form.month}
              onChange={(e) => {
                const month = e.target.value;
                setForm((f) => ({ ...f, month, title: titleTouched || !month ? f.title : defaultTitle(month) }));
              }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titolo *</label>
            <input
              required
              className={input}
              value={form.title}
              onChange={(e) => { setTitleTouched(true); setForm((f) => ({ ...f, title: e.target.value })); }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Apertura votazioni (ora di Roma) *</label>
            <input required type="datetime-local" className={input} value={form.opens_at} onChange={(e) => setForm((f) => ({ ...f, opens_at: e.target.value }))} />
            {form.opens_at && <p className="text-[11px] text-gray-400 mt-1">{formatRomeDateTime(romeLocalToIso(form.opens_at))}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Chiusura votazioni (ora di Roma) *</label>
            <input required type="datetime-local" className={input} value={form.closes_at} onChange={(e) => setForm((f) => ({ ...f, closes_at: e.target.value }))} />
            {form.closes_at && <p className="text-[11px] text-gray-400 mt-1">{formatRomeDateTime(romeLocalToIso(form.closes_at))}</p>}
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Candidati * ({candidates.length} scelti)</span>
              <button type="button" onClick={() => setCandidates([])} className="text-xs text-gray-400 hover:text-gray-700">Deseleziona tutti</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {selectable.map((p) => {
                const on = candidates.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className={`relative rounded-xl overflow-hidden border-2 text-left transition ${on ? "border-brand-red" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <div className="relative aspect-[3/4] bg-gray-200">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photo_url} alt={p.full_name} className="absolute inset-0 w-full h-full object-cover object-top" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-2xl text-gray-400">👤</span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6">
                        <p className="text-white text-[11px] font-semibold leading-tight">
                          {p.shirt_number !== null && <span className="opacity-70">#{p.shirt_number} </span>}
                          {p.full_name}
                        </p>
                      </div>
                      {on && <span className="absolute top-1 right-1 bg-brand-red text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={loading} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Salvataggio..." : editId ? "Salva modifiche" : "Crea votazione"}
            </button>
            {editId && <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700">Annulla</button>}
            {msg && <span className={`text-sm ${msg.ok ? "text-green-600" : "text-brand-red"}`}>{msg.text}</span>}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {polls.length === 0 && <p className="text-sm text-gray-400">Nessuna votazione creata.</p>}
        {polls.map((p) => {
          const status = pollStatus(p);
          const votes = results[p.id] ?? {};
          const total = Object.values(votes).reduce((a, b) => a + b, 0);
          const ranked = p.mvp_candidates
            .map((c) => ({ player: byId[c.player_id], votes: votes[c.player_id] ?? 0 }))
            .filter((r) => r.player)
            .sort((a, b) => b.votes - a.votes);
          return (
            <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-brand-blue">{p.title}</h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusClass[status]}`}>{statusLabel[status]}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Dal {formatRomeDateTime(p.opens_at)} al {formatRomeDateTime(p.closes_at)} · {total} voti
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {status === "upcoming" && (
                    <button onClick={() => setNow(p, "opens_at")} className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition">▶ Apri ora</button>
                  )}
                  {status === "open" && (
                    <button onClick={() => setNow(p, "closes_at")} className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full hover:bg-amber-100 transition">⏹ Chiudi ora</button>
                  )}
                  <button onClick={() => openEdit(p)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition">✏️ Modifica</button>
                  <button onClick={() => handleDelete(p)} className="text-xs text-gray-400 hover:text-red-500 transition">🗑️</button>
                </div>
              </div>
              <ul className="mt-4 flex flex-col gap-1.5">
                {ranked.map(({ player, votes: v }, i) => (
                  <li key={player.id} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-right text-xs text-gray-400 tabular-nums">{i + 1}</span>
                    <span className="flex-1 truncate">{player.full_name}</span>
                    <span className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                      <span className="block h-full bg-brand-red" style={{ width: `${total ? (v / total) * 100 : 0}%` }} />
                    </span>
                    <span className="w-16 text-right text-xs text-gray-600 tabular-nums">{v} voti</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
