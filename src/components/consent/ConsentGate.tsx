"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { readConsent, saveConsent } from "@/lib/consent";
import { useConsent } from "./useConsent";

/**
 * Blocca un contenuto di terze parti (Instagram, Google Maps) finché
 * l'utente non accetta i "Contenuti esterni": prima non parte nessuna
 * richiesta verso quei servizi.
 */
export default function ConsentGate({ children, service, height = 200 }: { children: ReactNode; service: string; height?: number }) {
  const { consent, ready } = useConsent();

  if (ready && consent?.external) return <>{children}</>;

  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-3 px-6 bg-surface-2/60 rounded-xl"
      style={{ minHeight: height }}
    >
      <ShieldCheck className="w-6 h-6 text-muted" aria-hidden />
      <p className="text-sm text-muted max-w-xs">
        Questo contenuto è fornito da <strong className="text-text">{service}</strong>, che può impostare cookie.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => saveConsent({ analytics: readConsent()?.analytics ?? false, external: true })}
          className="tap rounded-full bg-accent text-white text-sm font-semibold px-4 py-2 hover:brightness-110"
        >
          Mostra contenuto
        </button>
        <Link href="/cookie-policy" className="text-xs text-muted underline underline-offset-2 hover:text-text">
          Cookie policy
        </Link>
      </div>
    </div>
  );
}
