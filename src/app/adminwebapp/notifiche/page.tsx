"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOpponent } from "@/lib/competitions";
import { matchHref } from "@/lib/links";
import LogoField from "@/components/admin/LogoField";

interface MatchOption { id: string; slug: string | null; match_date: string; home_team: string | null; away_team: string; is_home: boolean; }
interface NotificationItem {
  id: string; title: string; body: string | null; image_url: string | null; url: string | null;
  sent_count: number; failed_count: number; created_at: string;
}
type LinkType = "none" | "match" | "url";

const emptyForm = { title: "", body: "", image_url: "", linkType: "none" as LinkType, url: "", match_id: "" };

function matchLabel(m: MatchOption) {
  const date = new Date(m.match_date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" });
  const opponent = getOpponent(m);
  return `${date} · ${m.is_home ? `Victoria Casa Hirta – ${opponent}` : `${opponent} – Victoria Casa Hirta`}`;
}

export default function AdminNotifiche() {
  const [form, setForm] = useState(emptyForm);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [history, setHistory] = useState<NotificationItem[]>([]);
  const [subscribers, setSubscribers] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase
      .from("matches")
      .select("id, slug, match_date, home_team, away_team, is_home")
      .order("match_date", { ascending: false })
      .then(({ data }) => setMatches((data as MatchOption[]) ?? []));
    fetchStatus();
  }, []);

  async function fetchStatus() {
    const [{ count }, { data }] = await Promise.all([
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
      supabase.from("notifications").select("id, title, body, image_url, url, sent_count, failed_count, created_at").order("created_at", { ascending: false }).limit(30),
    ]);
    setSubscribers(count ?? 0);
    setHistory((data as NotificationItem[]) ?? []);
  }

  const selectedMatch = matches.find((m) => m.id === form.match_id);
  const link = form.linkType === "match" ? (selectedMatch ? matchHref(selectedMatch) : "") : form.linkType === "url" ? form.url.trim() : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.linkType === "match" && !selectedMatch) return setMsg("Errore: seleziona una partita");
    if (form.linkType === "url" && !/^(https?:\/\/|\/)/i.test(link)) return setMsg("Errore: il link deve iniziare con https:// oppure /");
    if (!confirm(`Inviare la notifica a ${subscribers ?? 0} dispositivi?`)) return;

    setLoading(true);
    setMsg("");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          image_url: form.image_url,
          url: link || null,
          match_id: form.linkType === "match" ? form.match_id : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) setMsg("Errore: " + (json.error ?? res.statusText));
      else {
        setMsg(`Notifica inviata a ${json.sent} dispositivi${json.failed ? ` (${json.failed} non raggiunti)` : ""}`);
        setForm(emptyForm);
        fetchStatus();
      }
    } catch (err) {
      setMsg("Errore: " + (err as Error).message);
    }
    setLoading(false);
  }

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Admin – Notifiche</h1>
      <p className="text-gray-500 text-sm mb-8">
        {subscribers === null ? "…" : `${subscribers} dispositivi iscritti alle notifiche push`}
      </p>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-10">
        <h2 className="font-bold text-lg text-brand-blue mb-4">Nuova notifica</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titolo *</label>
            <input required maxLength={120} className={input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Contenuto</label>
            <textarea rows={5} maxLength={1000} className={`${input} resize-y`} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            <p className="text-[11px] text-gray-400 mt-1">{form.body.length}/1000 · sul telefono si vedono le prime righe</p>
          </div>
          <LogoField
            value={form.image_url}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            folder="notifications"
            label="Immagine (facoltativa, orizzontale 2:1; su iPhone non viene mostrata)"
            shape="square"
            size={96}
          />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Al tocco apre</label>
            <div className="flex flex-wrap gap-2">
              {([["none", "Home del sito"], ["match", "Una partita"], ["url", "Un link"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, linkType: value }))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${form.linkType === value ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-gray-600 border-gray-200 hover:border-brand-blue"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {form.linkType === "match" && (
            <select className={input} value={form.match_id} onChange={(e) => setForm((f) => ({ ...f, match_id: e.target.value }))}>
              <option value="">Seleziona una partita…</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>{matchLabel(m)}</option>
              ))}
            </select>
          )}
          {form.linkType === "url" && (
            <input className={input} placeholder="https://… oppure /news" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          )}
          <div>
            <button type="submit" disabled={loading || !subscribers} className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Invio in corso..." : "Invia notifica"}
            </button>
            {msg && <span className={`ml-4 text-sm ${msg.startsWith("Errore") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
          </div>
        </form>
      </div>

      <h2 className="font-bold text-lg text-brand-blue mb-3">Inviate</h2>
      {history.length === 0 && <p className="text-sm text-gray-400">Nessuna notifica inviata finora.</p>}
      <div className="flex flex-col gap-3">
        {history.map((n) => (
          <div key={n.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            {n.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.image_url} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0 bg-gray-100" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-brand-blue text-sm">{n.title}</div>
              {n.body && <div className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-line">{n.body}</div>}
              <div className="text-xs text-gray-400 mt-1">
                {new Date(n.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })} · inviata a {n.sent_count}
                {n.failed_count > 0 && `, ${n.failed_count} non raggiunti`}
                {n.url && <> · <span className="break-all">{n.url}</span></>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
