"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/rosa", label: "Rosa" },
  { href: "/competizioni", label: "Competizioni" },
  { href: "/calendario", label: "Calendario" },
  { href: "/classifica", label: "Classifica" },
  { href: "/cannonieri", label: "Cannonieri" },
  { href: "/campi", label: "Campi" },
  { href: "/news", label: "News" },
  { href: "/galleria", label: "Galleria" },
  { href: "/staff", label: "Staff" },
  { href: "/sponsors", label: "Sponsor" },
  { href: "/storico", label: "Storico" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2 font-extrabold text-brand-blue">
          <Image
            src="/logo.jpeg"
            alt="Victoria Casa Hirta"
            width={36}
            height={36}
            className="rounded-full"
          />
          <span className="tracking-wide text-sm md:text-base">VICTORIA CASA HIRTA</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-brand-blue hover:text-brand-red transition"
            >
              {l.label}
            </Link>
          ))}

          {/* Social icons desktop */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
            <a
              href="https://www.facebook.com/victoriacasahirta/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:text-brand-red transition"
              aria-label="Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/victoriacasahirta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:text-brand-red transition"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </a>
          </div>
        </div>

        <button
          aria-label="Apri menu"
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded border border-gray-300 text-brand-blue"
          onClick={() => setOpen(!open)}
        >
          {open ? "✕" : "☰"}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-200 flex flex-col text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 text-brand-blue hover:bg-brand-blue/5"
            >
              {l.label}
            </Link>
          ))}

          {/* Social mobile */}
          <div className="flex items-center justify-center gap-6 px-4 py-4 border-t border-gray-200">
            <a
              href="https://www.facebook.com/victoriacasahirta/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:text-brand-red transition"
              aria-label="Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/victoriacasahirta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:text-brand-red transition"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
