import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/ConditionalShell";
import PWAInstaller from "@/components/PWAInstaller";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Victoria Casa Hirta",
  description: "Sito ufficiale della squadra di calcio Victoria Casa Hirta",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#102c5c" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

// Applica il tema salvato prima del primo paint per evitare flash.
const themeInitScript = `
(function(){try{var t=localStorage.getItem("vch-theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light");}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo.jpeg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-text font-sans">
        <ConditionalShell>{children}</ConditionalShell>
        <PWAInstaller />
      </body>
    </html>
  );
}
