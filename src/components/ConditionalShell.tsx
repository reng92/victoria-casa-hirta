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
      <Header />
      <Livescore />
      <main>
        {children}
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <BottomNav />}
      {!isAdmin && <CookieBanner />}
      {!isAdmin && <Analytics />}
    </>
  );
}
