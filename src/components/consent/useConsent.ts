"use client";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/consent";

/** Consenso corrente, aggiornato quando l'utente cambia le preferenze. */
export function useConsent(): { consent: Consent | null; ready: boolean } {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return { consent, ready };
}
