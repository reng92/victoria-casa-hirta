import Link from "next/link";
import { Handshake } from "lucide-react";
import SponsorLogo from "./SponsorLogo";

export interface SponsorItem {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

/**
 * Sponsor in home. Loghi sempre a colori su tessera chiara o scura in base al
 * logo (vedi SponsorLogo), così restano leggibili in entrambi i temi.
 * Mobile: griglia a 2 colonne. Da sm in su: marquee orizzontale infinito
 * (track duplicato per il loop continuo via CSS).
 */
function SponsorTile({ s, hidden = false, className = "" }: { s: SponsorItem; hidden?: boolean; className?: string }) {
  const content = s.logo_url ? (
    <SponsorLogo src={s.logo_url} alt={s.name} className={className} />
  ) : (
    <span className={`flex items-center justify-center rounded-xl bg-white p-3 ring-1 ring-black/5 ${className}`}>
      <span className="font-display font-semibold text-sm text-neutral-900 text-center leading-tight">{s.name}</span>
    </span>
  );
  return s.website_url ? (
    <a
      href={s.website_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={s.name}
      tabIndex={hidden ? -1 : 0}
      className="tap block"
    >
      {content}
    </a>
  ) : (
    content
  );
}

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

      <ul className="grid grid-cols-2 gap-3 px-5 sm:hidden">
        {sponsors.map((s) => (
          <li key={s.id}>
            <SponsorTile s={s} className="h-20 w-full" />
          </li>
        ))}
      </ul>

      <div className="marquee overflow-hidden hidden sm:block">
        <ul className="marquee-track gap-4 px-5">
          {loop.map((s, i) => (
            <li key={`${s.id}-${i}`} className="shrink-0" aria-hidden={i >= sponsors.length}>
              <SponsorTile s={s} hidden={i >= sponsors.length} className="h-16 w-36" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
