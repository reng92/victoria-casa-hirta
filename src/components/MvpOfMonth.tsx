"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Award, Check, Clock, Crown, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Pill } from "@/components/ui/Badge";
import SectionHeader from "@/components/ui/SectionHeader";
import { initials } from "@/lib/format";
import {
  formatCountdown,
  formatRomeDateTime,
  monthLabel,
  pollStatus,
  voteErrors,
  type MvpCandidate,
  type MvpPoll,
} from "@/lib/mvp";

interface Props {
  poll: MvpPoll & { candidates: MvpCandidate[] };
  /** Ora in cui il server ha generato la pagina: evita differenze tra HTML e idratazione. */
  renderedAt: number;
  /** In home: card più compatta con il link alla pagina /mvp. */
  compact?: boolean;
}

function deviceId() {
  try {
    let id = localStorage.getItem("vch-device-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("vch-device-id", id);
    }
    return id;
  } catch {
    return null;
  }
}

export default function MvpOfMonth({ poll, renderedAt, compact = false }: Props) {
  // Scarto tra l'orologio del server e quello del dispositivo
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(renderedAt);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [myVote, setMyVote] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const status = pollStatus(poll, now + offset);

  const loadResults = useCallback(async () => {
    const { data } = await supabase.rpc("mvp_results", { p_poll: poll.id });
    const out: Record<string, number> = {};
    for (const r of (data as { player_id: string; votes: number }[]) ?? []) out[r.player_id] = Number(r.votes);
    setVotes(out);
  }, [poll.id]);

  useEffect(() => {
    setNow(Date.now());
    const started = Date.now();
    fetch("/api/time", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ now: server }: { now: number }) => {
        // Metà del tempo di andata e ritorno per compensare la latenza
        setOffset(server + (Date.now() - started) / 2 - Date.now());
      })
      .catch(() => {});
    const id = deviceId();
    if (id) {
      supabase.rpc("mvp_my_vote", { p_poll: poll.id, p_device: id }).then(({ data }) => {
        if (data) setMyVote(data as string);
      });
    }
    loadResults();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [poll.id, loadResults]);

  // Alla chiusura i risultati diventano definitivi
  useEffect(() => {
    if (status === "closed") loadResults();
  }, [status, loadResults]);

  async function vote() {
    if (!selected || sending) return;
    const id = deviceId();
    if (!id) {
      setMsg({ ok: false, text: voteErrors.bad_device });
      return;
    }
    setSending(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("mvp_vote", { p_poll: poll.id, p_player: selected, p_device: id });
    if (error) {
      setMsg({ ok: false, text: "Errore di connessione, riprova." });
    } else if (data === "ok") {
      setMyVote(selected);
      setMsg({ ok: true, text: "Voto registrato, grazie!" });
      loadResults();
    } else {
      setMsg({ ok: false, text: voteErrors[data as string] ?? "Voto non registrato." });
      if (data === "already_voted") loadResults();
    }
    setSending(false);
  }

  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(0, ...Object.values(votes));
  const showResults = status === "closed" || !!myVote;
  const canVote = status === "open" && !myVote;

  const candidates = useMemo(() => {
    if (!showResults) return poll.candidates;
    return [...poll.candidates].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0));
  }, [poll.candidates, votes, showResults]);

  const winners = status === "closed" && maxVotes > 0 ? poll.candidates.filter((c) => votes[c.id] === maxVotes) : [];
  const selectedPlayer = poll.candidates.find((c) => c.id === selected);

  return (
    <section className="bento-card h-full flex flex-col">
      <div className="p-5 pb-4 border-b border-border">
        <SectionHeader
          title={poll.title}
          eyebrow={`MVP del mese · ${monthLabel(poll.month)}`}
          icon={Award}
          href={compact ? "/mvp" : undefined}
          hrefLabel="Vai"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          {status === "upcoming" && (
            <>
              <Pill tone="neutral"><Clock className="w-3 h-3" aria-hidden /> Apre tra {formatCountdown(Date.parse(poll.opens_at) - now - offset)}</Pill>
              <span>Si vota da {formatRomeDateTime(poll.opens_at)}</span>
            </>
          )}
          {status === "open" && (
            <>
              <Pill tone="win">
                <span className="w-1.5 h-1.5 rounded-full bg-win animate-pulse-dot" aria-hidden /> Votazioni aperte
              </Pill>
              <span>Chiude tra {formatCountdown(Date.parse(poll.closes_at) - now - offset)} ({formatRomeDateTime(poll.closes_at)})</span>
            </>
          )}
          {status === "closed" && (
            <>
              <Pill tone="neutral"><Lock className="w-3 h-3" aria-hidden /> Votazioni chiuse</Pill>
              <span>{total} {total === 1 ? "voto" : "voti"} in totale</span>
            </>
          )}
          {status === "open" && myVote && <span>· {total} {total === 1 ? "voto" : "voti"}</span>}
        </div>
      </div>

      {winners.length > 0 && (
        <div className="px-5 py-3 bg-draw/10 border-b border-border flex items-center gap-2 text-sm">
          <Crown className="w-4 h-4 text-draw shrink-0" aria-hidden />
          <p>
            <span className="text-muted">{winners.length > 1 ? "MVP a pari merito: " : "MVP del mese: "}</span>
            <strong className="font-semibold">{winners.map((w) => w.full_name).join(" e ")}</strong>
          </p>
        </div>
      )}

      {msg && (
        <p
          className={`px-5 py-2 text-sm font-medium text-center border-b border-border ${msg.ok ? "bg-win/10 text-win" : "bg-loss/10 text-loss"}`}
          role="status"
        >
          {msg.text}
        </p>
      )}

      <ul
        className={`p-4 grid gap-3 ${
          compact ? "grid-cols-3 sm:grid-cols-4 xl:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        {candidates.map((p) => {
          const count = votes[p.id] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMine = myVote === p.id;
          const isSelected = selected === p.id;
          const isWinner = winners.some((w) => w.id === p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => canVote && setSelected(isSelected ? null : p.id)}
                disabled={!canVote}
                aria-pressed={canVote ? isSelected : undefined}
                aria-label={`${p.full_name}${showResults ? `, ${count} voti` : ""}`}
                className={`group relative w-full text-left rounded-card overflow-hidden border-2 transition ${
                  isWinner ? "border-draw" :
                  isSelected || isMine ? "border-accent" :
                  "border-transparent"
                } ${canVote ? "cursor-pointer hover:border-brand-soft/60" : "cursor-default"}`}
              >
                <div className="relative aspect-[3/4] bg-surface-2">
                  {p.photo_url ? (
                    <Image
                      src={p.photo_url}
                      alt={`${p.full_name}, candidato MVP del mese`}
                      fill
                      sizes={compact ? "(min-width: 1280px) 16vw, (min-width: 640px) 25vw, 33vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"}
                      className={`object-cover object-top transition-transform duration-500 ${canVote ? "group-hover:scale-[1.04]" : ""}`}
                    />
                  ) : (
                    <div className="absolute inset-0 mesh-hero flex items-center justify-center">
                      <span className={`font-display font-bold text-white/30 ${compact ? "text-2xl" : "text-4xl"}`}>{initials(p.full_name)}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" aria-hidden />
                  {p.shirt_number !== null && (
                    <span className={`absolute top-1.5 right-2 font-display font-bold text-white/90 leading-none tabular drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${compact ? "text-xl" : "text-3xl"}`} aria-hidden>
                      {p.shirt_number}
                    </span>
                  )}
                  {(isWinner || isSelected || isMine) && (
                    <span
                      className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isWinner ? "bg-draw text-black" : "bg-accent text-white"
                      }`}
                    >
                      {isWinner ? <><Crown className="w-3 h-3" aria-hidden /> MVP</> : <><Check className="w-3 h-3" aria-hidden /> {isMine ? "Il tuo voto" : "Scelto"}</>}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <p className={`font-display font-bold text-white leading-tight text-balance ${compact ? "text-xs" : "text-sm"}`}>{p.full_name}</p>
                    {showResults && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-[10px] text-white/80 tabular mb-0.5">
                          <span>{count} {count === 1 ? "voto" : "voti"}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/20 overflow-hidden">
                          <div className={`h-1 rounded-full transition-all duration-500 ${isWinner ? "bg-draw" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {canVote && (
        <div className="px-4 pb-4 mt-auto">
          <button
            type="button"
            onClick={vote}
            disabled={!selected || sending}
            className="w-full bg-accent text-white font-semibold py-3 rounded-full transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "Invio..." : selectedPlayer ? `Vota ${selectedPlayer.full_name}` : "Scegli un candidato"}
          </button>
          <p className="text-[11px] text-muted text-center mt-2">Un voto per dispositivo. I risultati si vedono dopo aver votato.</p>
        </div>
      )}
      {compact && !canVote && (
        <div className="px-4 pb-4 mt-auto">
          <Link href="/mvp" className="block text-center text-xs font-semibold text-accent-soft hover:text-text transition">
            Albo d&apos;oro degli MVP
          </Link>
        </div>
      )}
    </section>
  );
}
