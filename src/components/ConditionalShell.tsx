"use client";
import { usePathname } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import Livescore from "./Livescore";
import CookieBanner from "./consent/CookieBanner";
import Analytics from "./consent/Analytics";

export default function ConditionalShell({ children }: { children: import("react").ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/adminwebapp");

  return (
    <>
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:text-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold"
      >
        Salta al contenuto
      </a>
      <Header />
      <Livescore />
      <main id="contenuto" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <BottomNav />}
      {!isAdmin && <CookieBanner />}
      {!isAdmin && <Analytics />}
    </>
  );
}
