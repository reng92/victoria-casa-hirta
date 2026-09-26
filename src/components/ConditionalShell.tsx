"use client";
import { usePathname } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import Livescore from "./Livescore";

export default function ConditionalShell({ children }: { children: import("react").ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      <Header />
      <Livescore />
      <main className={isAdmin ? "" : "pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] md:pb-0"}>
        {children}
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <BottomNav />}
    </>
  );
}
