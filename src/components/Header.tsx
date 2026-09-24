"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { primaryNav, secondaryNav, isActivePath } from "@/lib/nav";

/**
 * Header sticky: trasparente in cima, vetro con blur allo scroll.
 * Logo a sinistra, nav orizzontale su desktop, toggle tema a destra.
 */
export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const secondaryActive = secondaryNav.some((l) => isActivePath(pathname, l.href));

  return (
    <header
      className={`sticky top-0 z-50 pt-safe transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled ? "glass border-x-0 border-t-0 shadow-soft" : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4" aria-label="Principale">
        <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="Victoria Casa Hirta, home">
          <Image
            src="/logo.jpeg"
            alt=""
            width={36}
            height={36}
            className="rounded-full ring-2 ring-white/10 shrink-0"
            priority
          />
          <span className="font-display font-bold tracking-tight text-sm md:text-base leading-none truncate">
            Victoria <span className="text-accent-soft">Casa Hirta</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium">
          {primaryNav.map((l) => {
            const active = isActivePath(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3 py-2 rounded-full transition ${
                  active ? "text-text" : "text-muted hover:text-text hover:bg-surface-2/60"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="header-nav-active"
                    className="absolute inset-0 rounded-full bg-surface-2 border border-border"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                    aria-hidden
                  />
                )}
                <span className="relative z-10">{l.label}</span>
              </Link>
            );
          })}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-full transition ${
                secondaryActive ? "text-text bg-surface-2 border border-border" : "text-muted hover:text-text hover:bg-surface-2/60"
              }`}
            >
              Altro
              <ChevronDown className={`w-4 h-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  role="menu"
                  initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-56 glass rounded-card shadow-soft p-1.5 grid grid-cols-1"
                >
                  {secondaryNav.map((l) => {
                    const Icon = l.icon;
                    const active = isActivePath(pathname, l.href);
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        role="menuitem"
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition ${
                          active ? "bg-surface-2 text-text" : "text-muted hover:text-text hover:bg-surface-2/70"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-brand-soft" aria-hidden />
                        {l.label}
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ThemeToggle />
      </nav>
    </header>
  );
}
