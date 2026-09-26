"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { primaryNav, secondaryNav, moreNav, isActivePath } from "@/lib/nav";

/**
 * Bottom navigation mobile (5 voci) con indicatore attivo animato (layoutId).
 * Rispetta env(safe-area-inset-bottom). Nascosta da md in su.
 */
/** Vibrazione breve al tocco (Android; iOS la ignora). */
function haptic() {
  try {
    navigator.vibrate?.(8);
  } catch {}
}

export default function BottomNav() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    setSheet(false);
  }, [pathname]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const secondaryActive = secondaryNav.some((l) => isActivePath(pathname, l.href));
  const items = [...primaryNav, moreNav];

  return (
    <>
      <nav
        aria-label="Navigazione mobile"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 glass border-x-0 border-b-0 pb-safe"
      >
        <ul className="grid grid-cols-5 h-16">
          {items.map((l) => {
            const Icon = l.icon;
            const isMore = l.href === moreNav.href;
            const active = isMore ? secondaryActive || sheet : isActivePath(pathname, l.href);
            const inner = (
              <>
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute top-1.5 inset-x-3 h-[calc(100%-12px)] rounded-2xl bg-brand/40 border border-brand-soft/20"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }}
                    aria-hidden
                  />
                )}
                <Icon
                  className={`relative z-10 w-5 h-5 transition-colors ${active ? "text-text nav-pop" : "text-muted"}`}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                <span
                  className={`relative z-10 text-[10px] font-semibold leading-none transition-colors ${
                    active ? "text-text" : "text-muted"
                  }`}
                >
                  {l.label}
                </span>
              </>
            );
            const cls = "tap relative flex flex-col items-center justify-center gap-1 h-full w-full select-none";
            return (
              <li key={l.href} className="relative">
                {isMore ? (
                  <button
                    type="button"
                    onClick={() => { haptic(); setSheet((s) => !s); }}
                    aria-expanded={sheet}
                    aria-controls="more-sheet"
                    className={cls}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link href={l.href} aria-current={active ? "page" : undefined} className={cls} onClick={haptic}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom sheet "Altro" */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.button
              type="button"
              aria-label="Chiudi menu"
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheet(false)}
            />
            <motion.div
              id="more-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Altre sezioni"
              className="md:hidden fixed inset-x-0 bottom-0 z-40 glass rounded-t-hero border-x-0 border-b-0 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+12px)] px-4 pt-3 shadow-soft"
              initial={reduce ? false : { y: "100%" }}
              animate={{ y: 0 }}
              exit={reduce ? undefined : { y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            >
              <div className="mx-auto w-10 h-1 rounded-full bg-text/20 mb-3" aria-hidden />
              <div className="flex items-center justify-between mb-3">
                <p className="font-display font-bold">Altre sezioni</p>
                <button
                  type="button"
                  onClick={() => setSheet(false)}
                  aria-label="Chiudi"
                  className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>
              <ul className="grid grid-cols-4 gap-2">
                {secondaryNav.map((l) => {
                  const Icon = l.icon;
                  const active = isActivePath(pathname, l.href);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border tap ${
                          active
                            ? "bg-brand/40 border-brand-soft/30 text-text"
                            : "bg-surface-2/60 border-border text-muted active:bg-surface-2"
                        }`}
                      >
                        <Icon className="w-5 h-5 text-brand-soft" aria-hidden />
                        <span className="text-[11px] font-semibold">{l.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
