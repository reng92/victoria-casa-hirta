"use client";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Home, RotateCw } from "lucide-react";

/** Errore in una pagina (di solito Supabase che non risponde): header e menu restano al loro posto. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4 py-12 text-center">
      <Image src="/logo.jpeg" alt="" width={80} height={80} className="mb-6 rounded-full ring-2 ring-white/10 opacity-60" />
      <h1 className="font-display text-h1">Qualcosa è andato storto</h1>
      <p className="text-muted mt-3 mb-8 max-w-xs text-balance">
        Non siamo riusciti a caricare questa pagina. Riprova tra qualche secondo.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="tap inline-flex items-center gap-2 rounded-full bg-accent text-white font-semibold px-6 min-h-11 text-sm hover:brightness-110"
        >
          <RotateCw className="w-4 h-4" aria-hidden />
          Riprova
        </button>
        <Link
          href="/"
          className="tap inline-flex items-center gap-2 rounded-full bg-surface-2 border border-border font-semibold px-6 min-h-11 text-sm hover:bg-surface-2/70"
        >
          <Home className="w-4 h-4" aria-hidden />
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
