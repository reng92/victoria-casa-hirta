import Image from "next/image";
import Link from "next/link";
import { Handshake } from "lucide-react";

export interface SponsorItem {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

/**
 * Marquee orizzontale infinito: loghi in grayscale → colore on hover.
 * Il track è duplicato per ottenere il loop continuo via CSS.
 */
export default function SponsorMarquee({ sponsors }: { sponsors: SponsorItem[] }) {
  if (sponsors.length === 0) return null;
  const loop = [...sponsors, ...sponsors];

  return (
    <section aria-label="Sponsor" className="bento-card py-5">
      <div className="flex items-center justify-between px-5 mb-4">
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-brand-soft" aria-hidden />
          <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">I nostri sponsor</p>
        </div>
        <Link href="/sponsors" className="text-xs font-semibold text-accent-soft hover:text-text transition">
          Tutti
        </Link>
      </div>
      <div className="marquee overflow-hidden">
        <ul className="marquee-track gap-10 px-5" aria-hidden={false}>
          {loop.map((s, i) => {
            const content = (
              <span className="flex items-center justify-center h-12 w-28 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition duration-300">
                {s.logo_url ? (
                  <Image
                    src={s.logo_url}
                    alt={s.name}
                    width={112}
                    height={48}
                    sizes="112px"
                    className="object-contain max-h-12 w-auto"
                  />
                ) : (
                  <span className="font-display font-semibold text-sm text-muted whitespace-nowrap">{s.name}</span>
                )}
              </span>
            );
            return (
              <li key={`${s.id}-${i}`} className="shrink-0" aria-hidden={i >= sponsors.length}>
                {s.website_url ? (
                  <a href={s.website_url} target="_blank" rel="noopener noreferrer" aria-label={s.name} tabIndex={i >= sponsors.length ? -1 : 0}>
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
