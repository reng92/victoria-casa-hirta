"use client";
import Script from "next/script";
import { useEffect } from "react";
import { GA_ID } from "@/lib/consent";
import { useConsent } from "./useConsent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics 4 caricato SOLO dopo il consenso ai cookie statistici
 * (nessuna richiesta a Google prima della scelta). Le pagine viste nella
 * navigazione client sono tracciate dalla "misurazione avanzata" di GA4.
 */
export default function Analytics() {
  const { consent } = useConsent();
  const granted = !!consent?.analytics;

  // Revoca dopo che lo script era già stato caricato in questa sessione
  useEffect(() => {
    if (!granted && window.gtag) {
      window.gtag("consent", "update", { analytics_storage: "denied" });
    }
  }, [granted]);

  if (!granted) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
