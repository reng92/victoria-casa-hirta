"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-brand-blue text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Victoria Casa Hirta"
            width={44}
            height={44}
            className="rounded-full"
            priority
          />
          <span className="font-bold text-base tracking-wide hidden sm:block">
            Victoria Casa Hirta
          </span>
        </Link>

        {/* Desktop menu */}
        <div className="hidden lg:flex gap-6 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-brand-red transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-white transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-brand-blue border-t border-white/10 px-4 pb-4 flex flex-col gap-3 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-brand-red transition-colors py-1 border-b border-white/10"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
