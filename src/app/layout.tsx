import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ConditionalShell from "@/components/ConditionalShell";
import PWAInstaller from "@/components/PWAInstaller";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

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

// Solo le cifre di Inter (6 KB), messe davanti a Space Grotesk nei titoli e nei
// punteggi: l'"1" di Space Grotesk ha il piede e sembra un'altra lettera.
const digits = localFont({
  src: "./fonts/inter-digits.woff2",
  variable: "--font-digits",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0030-0039" }],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Victoria Casa Hirta · Squadra di calcio amatoriale in Campania",
    template: "%s · Victoria Casa Hirta",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Victoria Casa Hirta", "VCH", "calcio amatoriale", "Campania", "Over 35", "Campania Cup", "risultati", "classifica"],
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
  // Proprietà del sito su Google Search Console
  verification: { google: "H0mNoUWRCc7zWkdFWR1zBPFh8GTmyz2O2q5fWwCHoZk" },
  // Anteprima dei link condivisi su WhatsApp, Facebook e altri social
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: SITE_NAME,
    url: "/",
    title: "Victoria Casa Hirta · Squadra di calcio amatoriale in Campania",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Victoria Casa Hirta · Squadra di calcio amatoriale in Campania",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

// Dati strutturati per Google: la squadra e il sito
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  name: SITE_NAME,
  alternateName: "VCH",
  sport: "Calcio",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.jpeg`,
  image: `${SITE_URL}${DEFAULT_OG_IMAGE.url}`,
  foundingDate: "2016",
  description: SITE_DESCRIPTION,
  location: { "@type": "Place", address: { "@type": "PostalAddress", addressRegion: "Campania", addressCountry: "IT" } },
  sameAs: ["https://www.facebook.com/victoriacasahirta/", "https://www.instagram.com/victoriacasahirta"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Il tema di default è scuro: lo script qui sotto e ThemeToggle aggiornano il
  // colore quando si sceglie il tema chiaro
  themeColor: "#0b1220",
};

// Applica il tema salvato prima del primo paint per evitare flash.
const themeInitScript = `
(function(){try{var t=localStorage.getItem("vch-theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#f4f6fb");}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${inter.variable} ${spaceGrotesk.variable} ${digits.variable}`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="min-h-dvh bg-bg text-text font-sans">
        <ConditionalShell>{children}</ConditionalShell>
        <PWAInstaller />
      </body>
    </html>
  );
}
