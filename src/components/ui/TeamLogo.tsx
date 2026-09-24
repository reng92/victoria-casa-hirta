import Image from "next/image";
import { initials } from "@/lib/format";

interface Props {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Logo squadra via next/image con fallback alle iniziali.
 * Riserva sempre le dimensioni per evitare layout shift.
 */
export default function TeamLogo({ src, name, size = 48, className = "", priority = false }: Props) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full bg-white overflow-hidden shrink-0 ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-contain p-[8%]"
          priority={priority}
        />
      ) : (
        <span className="font-display font-bold text-brand-blue" style={{ fontSize: Math.max(10, size * 0.32) }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

export function VCHLogo({ size = 48, className = "", priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return <TeamLogo src="/logo.jpeg" name="Victoria Casa Hirta" size={size} className={className} priority={priority} />;
}
