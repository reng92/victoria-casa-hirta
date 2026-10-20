"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import { matchInstant } from "@/lib/format";
import { deviceId, pickOptions, predictErrors, type Pick } from "@/lib/predictions";

interface Props {
  matchId: string;
  matchDate: string;
  isHome: boolean;
  status: string;
  opponent: string;
  /** In home: link alla classifica dei tifosi nell'intestazione. */
  compact?: boolean;
}

/**
 * Pronostico 1/X/2 di una partita. Senza account: al primo pronostico il
 * tifoso sceglie un nickname, legato al dispositivo. Si può cambiare fino al
 * calcio d'inizio; dopo aver votato si vedono le percentuali degli altri.
 */
export default function MatchPrediction({ matchId, matchDate, isHome, status, opponent, compact = false }: Props) {
  const [nickname, setNickname] = useState<string | null>(null);
  const [myPick, setMyPick] = useState<Pick | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Pick | null>(null);
  const [nickInput, setNickInput] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [closed, setClosed] = useState(status !== "scheduled");

  const options = pickOptions(isHome, opponent);

  const loadStats = useCallback(async () => {
    const { data } = await supabase.rpc("predict_stats", { p_match: matchId });
    const out: Record<string, number> = {};
    for (const r of (data as { pick: string; total: number }[]) ?? []) out[r.pick] = Number(r.total);
    setStats(out);
  }, [matchId]);

  useEffect(() => {
    setClosed(status !== "scheduled" || Date.now() >= matchInstant(matchDate));
    const id = deviceId();
    if (id) {
      supabase.rpc("predict_me", { p_device: id, p_match: matchId }).then(({ data }) => {
        const me = (data as { nickname: string; pick: Pick | null }[] | null)?.[0];
        if (me) {
          setNickname(me.nickname);
          setMyPick(me.pick);
        }
      });
    }
    loadStats();
  }, [matchId, matchDate, status, loadStats]);

  async function send(pick: Pick) {
    if (sending) return;
    const id = deviceId();
    if (!id) return setMsg({ ok: false, text: predictErrors.bad_device });
    setSending(true);
    setMsg(null);
    try {
      if (!nickname) {
        const { data, error } = await supabase.rpc("predict_set_nickname", { p_device: id, p_nickname: nickInput });
        if (error) throw error;
        if (data !== "ok") return setMsg({ ok: false, text: predictErrors[data as string] ?? "Nickname non salvato." });
        setNickname(nickInput.trim().replace(/\s+/g, " "));
      }
      const { data, error } = await supabase.rpc("predict", { p_match: matchId, p_pick: pick, p_device: id });
      if (error) throw error;
      if (data === "ok") {
        setMyPick(pick);
        setSelected(null);
        setMsg({ ok: true, text: myPick ? "Pronostico cambiato." : "Pronostico registrato, in bocca al lupo!" });
        window.gtag?.("event", "prediction", { match_id: matchId, pick, changed: !!myPick });
        loadStats();
      } else {
        if (data === "closed") {
          setClosed(true);
          setSelected(null);
        }
        setMsg({ ok: false, text: predictErrors[data as string] ?? "Pronostico non registrato." });
      }
    } catch {
      setMsg({ ok: false, text: "Errore di connessione, riprova." });
    } finally {
      setSending(false);
    }
  }

  function choose(pick: Pick) {
    if (closed || sending) return;
    // Senza nickname si sceglie prima l'esito, poi si conferma con il nome
    if (!nickname) return setSelected(pick);
    if (pick !== myPick) send(pick);
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const showStats = (!!myPick || closed) && total > 0;

  return (
    <section className="bento-card p-5 h-full flex flex-col">
      <SectionHeader
        title="Il tuo pronostico"
        eyebrow={closed ? "Pronostici chiusi" : "Pronostici aperti fino al fischio d'inizio"}
        icon={Sparkles}
        href={compact ? "/pronostici" : undefined}
        hrefLabel="Classifica"
      />

      <div className="grid grid-cols-3 gap-2 mt-4" role="group" aria-label="Scegli l'esito">
        {options.map((o) => {
          const active = (selected ?? myPick) === o.pick;
          const pct = total ? Math.round(((stats[o.pick] ?? 0) / total) * 100) : 0;
          return (
            <button
              key={o.pick}
              type="button"
              onClick={() => choose(o.pick)}
              disabled={closed || sending}
              aria-pressed={active}
              className={`relative overflow-hidden rounded-2xl border px-2 py-3 flex flex-col items-center gap-1 transition tap disabled:cursor-default ${
                active ? "border-accent bg-accent/10" : "border-border bg-surface-2/50 enabled:hover:bg-surface-2"
              }`}
            >
              {showStats && (
                <span className="absolute inset-x-0 bottom-0 bg-brand-soft/15" style={{ height: `${pct}%` }} aria-hidden />
              )}
              <span className="relative font-display text-2xl font-bold leading-none">{o.sign}</span>
              <span className="relative text-[11px] text-muted leading-tight text-center line-clamp-2 min-h-[2lh]">{o.label}</span>
              {showStats && <span className="relative text-xs font-semibold tabular">{pct}%</span>}
              {myPick === o.pick && (
                <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-accent" aria-label="Il tuo pronostico" />
              )}
            </button>
          );
        })}
      </div>

      {selected && !nickname && !closed && (
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(selected);
          }}
        >
          <label htmlFor={`nick-${matchId}`} className="text-xs text-muted">
            Scegli un nickname per la classifica dei tifosi (niente email, resta su questo dispositivo)
          </label>
          <div className="flex gap-2">
            <input
              id={`nick-${matchId}`}
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              placeholder="es. UltràHirta"
              className="flex-1 min-w-0 rounded-full bg-surface-2 border border-border px-4 py-2.5 text-base sm:text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={sending || nickInput.trim().length < 3}
              className="shrink-0 rounded-full bg-accent text-white font-semibold px-4 py-2.5 text-sm disabled:opacity-50 tap"
            >
              Conferma
            </button>
          </div>
        </form>
      )}

      <div className="mt-auto pt-3 text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
        {closed && !myPick && (
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" aria-hidden /> Partita iniziata</span>
        )}
        {nickname && <span>Giochi come <strong className="text-text">{nickname}</strong></span>}
        {myPick && !closed && <span>Puoi cambiarlo fino al fischio d&apos;inizio.</span>}
        {!myPick && !closed && !selected && <span>Un punto per ogni pronostico azzeccato.</span>}
        {total > 0 && <span className="tabular">{total} {total === 1 ? "pronostico" : "pronostici"}</span>}
      </div>
      {msg && (
        <p role="status" className={`mt-2 text-xs font-semibold ${msg.ok ? "text-win" : "text-loss"}`}>{msg.text}</p>
      )}
    </section>
  );
}
