"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from "@/lib/consent";

const categories = [
  {
    key: "necessary" as const,
    title: "Necessari",
    text: "Fanno funzionare il sito: tema chiaro/scuro, preferenze cookie, accesso all'area riservata.",
    locked: true,
  },
  {
    key: "analytics" as const,
    title: "Statistici",
    text: "Google Analytics: ci dice in forma aggregata quante persone visitano il sito e quali pagine.",
  },
  {
    key: "external" as const,
    title: "Contenuti esterni",
    text: "Video di Instagram e mappe di Google Maps nelle pagine delle partite.",
  },
];

/**
 * Banner cookie conforme alle Linee guida del Garante (giugno 2021):
 * nessun cookie non tecnico prima della scelta, "Rifiuta" con lo stesso
 * peso di "Accetta", la X chiude rifiutando, scelte granulari per categoria,
 * preferenze sempre modificabili dal footer.
 */
export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, external: false });
  const reduce = useReducedMotion();
  const titleId = useId();

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const onOpen = () => {
      const c = readConsent();
      setPrefs({ analytics: c?.analytics ?? false, external: c?.external ?? false });
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, []);

  function choose(choice: { analytics: boolean; external: boolean }) {
    saveConsent(choice);
    setOpen(false);
    setDetails(false);
  }

  const btn = "tap flex-1 rounded-full px-4 py-2.5 text-sm font-semibold";

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          initial={reduce ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 16, opacity: 0, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="fixed z-[60] inset-x-3 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+12px)] md:inset-x-auto md:left-6 md:bottom-6 md:w-[400px] glass rounded-card shadow-soft p-4 text-sm"
        >
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0" aria-hidden>
              <Cookie className="w-4 h-4 text-accent-soft" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 id={titleId} className="font-display font-bold leading-tight">Cookie e privacy</h2>
              <p className="text-muted text-xs mt-1 leading-relaxed">
                Usiamo cookie tecnici e, solo con il tuo consenso, cookie statistici e contenuti esterni.{" "}
                <Link href="/cookie-policy" className="underline underline-offset-2 text-text/80 hover:text-text">Cookie policy</Link>
              </p>
            </div>
            <button
              type="button"
              onClick={() => choose({ analytics: false, external: false })}
              aria-label="Chiudi e rifiuta i cookie non necessari"
              className="tap w-8 h-8 -mr-1 -mt-1 rounded-full text-muted hover:text-text hover:bg-surface-2 flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>

          {details && (
            <ul className="mt-3 flex flex-col gap-2">
              {categories.map((c) => {
                const checked = c.locked ? true : prefs[c.key as "analytics" | "external"];
                return (
                  <li key={c.key} className="rounded-xl bg-surface-2/60 border border-border p-3">
                    <label className={`flex items-start gap-3 ${c.locked ? "" : "cursor-pointer"}`}>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-[13px]">{c.title}{c.locked && <span className="text-muted font-normal"> · sempre attivi</span>}</span>
                        <span className="block text-muted text-xs mt-0.5 leading-snug">{c.text}</span>
                      </span>
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={checked}
                        disabled={c.locked}
                        onChange={(e) => setPrefs((p) => ({ ...p, [c.key]: e.target.checked }))}
                      />
                      <span
                        aria-hidden
                        className={`relative mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-soft ${
                          checked ? "bg-accent" : "bg-text/20"
                        } ${c.locked ? "opacity-60" : ""}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : ""}`}
                        />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => choose({ analytics: false, external: false })} className={`${btn} bg-surface-2 border border-border hover:bg-surface-2/70`}>
              Rifiuta
            </button>
            {details ? (
              <button type="button" onClick={() => choose(prefs)} className={`${btn} bg-accent text-white hover:brightness-110`}>
                Salva scelte
              </button>
            ) : (
              <button type="button" onClick={() => choose({ analytics: true, external: true })} className={`${btn} bg-accent text-white hover:brightness-110`}>
                Accetta tutti
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs">
            {details ? (
              <button type="button" onClick={() => choose({ analytics: true, external: true })} className="text-muted underline underline-offset-2 hover:text-text">
                Accetta tutti
              </button>
            ) : (
              <button type="button" onClick={() => setDetails(true)} className="text-muted underline underline-offset-2 hover:text-text">
                Personalizza
              </button>
            )}
            <Link href="/privacy-policy" className="text-muted underline underline-offset-2 hover:text-text">Privacy policy</Link>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
