import type { Metadata } from "next";

export const SITE_URL = "https://victoriacasahirta.it";
export const SITE_NAME = "Victoria Casa Hirta";
export const SITE_DESCRIPTION =
  "Sito ufficiale della Victoria Casa Hirta, squadra di calcio amatoriale campana dal 2016: partite, risultati, classifiche, rosa, foto e news.";

/** Foto di squadra 2026/27 ritagliata a 1200×630, il formato delle anteprime di Facebook e WhatsApp. */
export const DEFAULT_OG_IMAGE = {
  url: "/og-vch.jpg",
  width: 1200,
  height: 630,
  alt: "La squadra della Victoria Casa Hirta nella stagione 2026/27",
};

interface PageMeta {
  /** Titolo della pagina, senza il nome del sito (lo aggiunge il template). */
  title: string;
  description: string;
  path: string;
  image?: { url: string; width?: number; height?: number; alt?: string } | null;
  type?: "website" | "article" | "profile";
  /** Testo dell'anteprima social, se diverso dal titolo. */
  socialTitle?: string;
  /** Titolo usato così com'è, senza " · Victoria Casa Hirta" (es. partite, che contengono già il nome). */
  absolute?: boolean;
}

/**
 * Metadata di una pagina pubblica: titolo, descrizione, canonical e anteprima
 * social. Va ripetuta l'immagine perché Next sostituisce (non unisce) il
 * blocco openGraph del layout.
 */
export function pageMetadata({ title, description, path, image, type = "website", socialTitle, absolute }: PageMeta): Metadata {
  const img = image ?? DEFAULT_OG_IMAGE;
  const ogTitle = socialTitle ?? (absolute ? title : `${title} · ${SITE_NAME}`);
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      locale: "it_IT",
      siteName: SITE_NAME,
      url: path,
      title: ogTitle,
      description,
      images: [img],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [img.url],
    },
  };
}

/** Testo semplice e breve per le meta description. */
export function excerpt(text: string | null | undefined, max = 158) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
