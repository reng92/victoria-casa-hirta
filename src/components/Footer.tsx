import Image from "next/image";
import Link from "next/link";
import { primaryNav, secondaryNav } from "@/lib/nav";
import AnniversaryBadge from "./AnniversaryBadge";

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  const links = [...primaryNav, ...secondaryNav];
  return (
    <footer className="mt-16 border-t border-border bg-surface/40">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1.2fr_2fr_auto] md:items-start">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpeg" alt="" width={44} height={44} className="rounded-full ring-2 ring-white/10" />
            <div>
              <p className="font-display font-bold leading-tight">Victoria Casa Hirta</p>
              <p className="text-muted text-xs">A.S.D. dal 2016 · Campania</p>
            </div>
            <AnniversaryBadge size={56} className="ml-2" />
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 xs:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-muted hover:text-text transition py-0.5">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:justify-end">
            <a
              href="https://www.facebook.com/victoriacasahirta/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-surface-2 border border-border hover:bg-brand hover:text-white transition flex items-center justify-center text-text"
              aria-label="Facebook"
            >
              <FacebookIcon />
            </a>
            <a
              href="https://www.instagram.com/victoriacasahirta"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-surface-2 border border-border hover:bg-accent hover:text-white transition flex items-center justify-center text-text"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-muted text-xs flex flex-col sm:flex-row gap-1 sm:justify-between">
          <p>Associazione Sportiva di Fatto Victoria Casa Hirta · 10 anni di sport e amicizia, 2016–2026</p>
          <p>© {new Date().getFullYear()} Tutti i diritti riservati.</p>
          <p>
            Made with <span className="text-accent-soft" aria-label="amore">♥</span> by{" "}
            <a
              href="https://traccestudio.it"
              target="_blank"
              rel="noopener"
              className="font-semibold text-text/80 hover:text-text underline-offset-2 hover:underline transition-colors"
            >
              Tracce Web Agency
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
