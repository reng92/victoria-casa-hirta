"use client";
import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Focus dei dialog modali: all'apertura va sul primo elemento con
 * `data-autofocus` (o sul primo focusabile), Tab resta dentro al dialog e
 * alla chiusura torna all'elemento che l'aveva aperto.
 */
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    // Il dialog può montare un frame dopo (AnimatePresence)
    const raf = requestAnimationFrame(() => {
      const root = ref.current;
      const first = root?.querySelector<HTMLElement>("[data-autofocus]") ?? root?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      const root = ref.current;
      if (e.key !== "Tab" || !root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!root.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      trigger?.focus?.({ preventScroll: true });
    };
  }, [open, ref]);
}
