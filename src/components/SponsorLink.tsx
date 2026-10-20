"use client";
import type { ReactNode } from "react";

/**
 * Link esterno al sito di uno sponsor che registra l'evento GA4
 * `sponsor_click` (nome sponsor e posizione nel sito), così a fine stagione
 * si può mostrare a ogni sponsor quante visite gli abbiamo portato.
 * `window.gtag` esiste solo dopo il consenso ai cookie statistici.
 */
export default function SponsorLink({
  href,
  sponsor,
  placement,
  className,
  ariaLabel,
  tabIndex,
  children,
}: {
  href: string;
  sponsor: string;
  placement: "home" | "sponsor_page";
  className?: string;
  ariaLabel?: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      className={className}
      onClick={() =>
        window.gtag?.("event", "sponsor_click", {
          sponsor_name: sponsor,
          placement,
          link_url: href,
          transport_type: "beacon",
        })
      }
    >
      {children}
    </a>
  );
}
