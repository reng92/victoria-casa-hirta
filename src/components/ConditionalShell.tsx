"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Livescore from "./Livescore";
import Countdown from "./Countdown";

export default function ConditionalShell({ children }: { children: import("react").ReactNode }) {
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";

  return (
    <>
      {!isComingSoon && <Navbar />}
      {!isComingSoon && <Livescore />}
      {!isComingSoon && <Countdown />}
      <main>{children}</main>
      {!isComingSoon && <Footer />}
    </>
  );
}
