import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Livescore from "@/components/Livescore";
import PWAInstaller from "@/components/PWAInstaller";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Victoria Casa Hirta",
  description: "Sito ufficiale della squadra di calcio Victoria Casa Hirta",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#102c5c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/logo.jpeg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        <Navbar />
        <Livescore />
        <main>{children}</main>
        <Footer />
        <PWAInstaller />
      </body>
    </html>
  );
}
