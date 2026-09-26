"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, BellOff, BellRing } from "lucide-react";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push";

/**
 * Campanella nell'header: il visitatore attiva o disattiva le notifiche push
 * in qualsiasi momento, senza registrarsi.
 */
export default function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      setError("Qualcosa è andato storto. Riprova tra poco.");
    }
    setBusy(false);
  }

  if (state === null || state === "unsupported") return null;

  const on = state === "on";
  const Icon = on ? BellRing : state === "denied" ? BellOff : Bell;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={on ? "Notifiche attive" : "Notifiche"}
        title="Notifiche"
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full glass text-text hover:bg-surface-2 transition"
      >
        <Icon className="w-[18px] h-[18px]" aria-hidden />
        {on && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" aria-hidden />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifiche push"
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] glass rounded-card shadow-soft p-4 text-sm"
          >
            <p className="font-bold text-text">Notifiche push</p>
            {state === "ios-install" ? (
              <p className="text-muted mt-1.5">
                Su iPhone le notifiche funzionano solo dall'app: tocca <strong>Condividi</strong> e poi{" "}
                <strong>Aggiungi alla schermata Home</strong>, apri il sito da lì e attivale con questa campanella.
              </p>
            ) : state === "denied" ? (
              <p className="text-muted mt-1.5">
                Hai bloccato le notifiche per questo sito. Per riceverle, consentile dalle impostazioni del browser e
                ricarica la pagina.
              </p>
            ) : (
              <>
                <p className="text-muted mt-1.5">
                  {on
                    ? "Riceverai risultati, partite e novità della Victoria. Puoi disattivarle quando vuoi."
                    : "Ricevi risultati, partite e novità della Victoria. Nessuna registrazione, puoi disattivarle quando vuoi."}
                </p>
                <button
                  type="button"
                  onClick={toggle}
                  disabled={busy}
                  className={`mt-3 w-full rounded-full px-4 py-2 font-semibold transition disabled:opacity-60 ${
                    on ? "bg-surface-2 text-text border border-border hover:bg-surface-2/70" : "bg-accent text-white hover:brightness-110"
                  }`}
                >
                  {busy ? "Attendi…" : on ? "Disattiva notifiche" : "Attiva notifiche"}
                </button>
                {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
