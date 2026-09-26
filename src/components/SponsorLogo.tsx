"use client";
import Image from "next/image";
import { useState, type SyntheticEvent } from "react";

/**
 * Logo sponsor su tessera che si adatta al logo: bianca di default,
 * scura quando il logo è trasparente e prevalentemente chiaro (es. testo
 * bianco), che su bianco sparirebbe. Analisi fatta una volta al load su
 * un canvas 32x32 (le immagini di next/image sono same-origin).
 */
function isLightOnTransparent(img: HTMLImageElement) {
  try {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let transparent = 0, opaque = 0, light = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 32) { transparent++; continue; }
      opaque++;
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      if (lum > 0.85) light++;
    }
    const total = data.length / 4;
    return transparent / total > 0.2 && opaque > 0 && light / opaque > 0.3;
  } catch {
    return false;
  }
}

export default function SponsorLogo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [dark, setDark] = useState(false);
  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    if (isLightOnTransparent(e.currentTarget)) setDark(true);
  };
  return (
    <span
      className={`flex items-center justify-center rounded-xl p-3 transition-colors ${
        dark ? "bg-neutral-900 ring-1 ring-white/10" : "bg-white ring-1 ring-black/5"
      } ${className}`}
    >
      <Image src={src} alt={alt} width={160} height={80} sizes="160px" onLoad={onLoad} className="object-contain w-full h-full" />
    </span>
  );
}
