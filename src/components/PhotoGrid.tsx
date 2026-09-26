"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface GridPhoto {
  id: string;
  src: string;
  caption?: string | null;
  /** Testo sotto la foto ingrandita, es. la partita. */
  label?: string | null;
}

interface Props {
  photos: GridPhoto[];
  /** Classi delle colonne: le foto si impilano intere, senza ritagli. */
  className?: string;
  /** Quante immagini caricare subito (sopra la piega). */
  priorityCount?: number;
  sizes?: string;
}

/**
 * Foto a colonne con le proporzioni originali (nessuna testa tagliata);
 * al tocco la foto si apre a tutto schermo e si scorre.
 */
export default function PhotoGrid({
  photos,
  className = "columns-2 sm:columns-3 md:columns-4",
  priorityCount = 0,
  sizes = "(min-width:768px) 25vw, (min-width:640px) 33vw, 50vw",
}: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: number) => setOpen((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, close, step]);

  // Swipe orizzontale sul telefono
  const [touchX, setTouchX] = useState<number | null>(null);
  const current = open !== null ? photos[open] : null;

  return (
    <>
      <ul className={`gap-2 ${className}`}>
        {photos.map((p, i) => (
          <li key={p.id} className="group relative mb-2 break-inside-avoid rounded-card overflow-hidden bg-surface-2 border border-border">
            <button type="button" onClick={() => setOpen(i)} className="relative block w-full" aria-label={`Apri foto${p.caption ? `: ${p.caption}` : ""}`}>
              <Image
                src={p.src}
                alt={p.caption ?? p.label ?? "Foto della squadra"}
                width={800}
                height={1000}
                sizes={sizes}
                priority={i < priorityCount}
                className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {p.caption && (
                <span className="absolute inset-x-0 bottom-0 pt-10 pb-2.5 px-3 bg-gradient-to-t from-black/75 to-transparent text-left">
                  <span className="text-white text-xs font-medium leading-snug line-clamp-2">{p.caption}</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto ingrandita"
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onClick={close}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            setTouchX(null);
          }}
        >
          <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 text-white/80 text-sm">
            <span className="tabular">{open! + 1} / {photos.length}</span>
            <button type="button" onClick={close} className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-white/10" aria-label="Chiudi">
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
            <Image src={current.src} alt={current.caption ?? current.label ?? "Foto"} fill sizes="100vw" className="object-contain" priority />
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60" aria-label="Foto precedente">
                  <ChevronLeft className="w-6 h-6" aria-hidden />
                </button>
                <button type="button" onClick={() => step(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60" aria-label="Foto successiva">
                  <ChevronRight className="w-6 h-6" aria-hidden />
                </button>
              </>
            )}
          </div>
          {(current.caption || current.label) && (
            <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-white">
              {current.caption && <p className="text-sm font-medium">{current.caption}</p>}
              {current.label && <p className="text-xs text-white/60 mt-0.5">{current.label}</p>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
