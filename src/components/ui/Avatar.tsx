import Image from "next/image";
import { initials } from "@/lib/format";

interface Props {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  rounded?: "full" | "xl";
}

/** Avatar giocatore/staff con fallback alle iniziali. Dimensioni riservate. */
export default function Avatar({ src, name, size = 40, className = "", rounded = "full" }: Props) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-xl";
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden shrink-0 bg-surface-2 border border-border ${radius} ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="font-display font-bold text-muted" style={{ fontSize: Math.max(10, size * 0.36) }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}
