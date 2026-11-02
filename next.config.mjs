const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qhzlqmiddvhyjvtlgysc.supabase.co";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Niente Image Optimization di Vercel: il piano gratuito ha solo 5.000
    // trasformazioni al mese. Le foto vengono compresse al caricamento (lib/storage.ts).
    unoptimized: true,
  },
  async headers() {
    // I nomi dei file caricati sono unici (timestamp + suffisso casuale): cache lunga
    return [
      {
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "CDN-Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    // Gestiti dalla CDN di Vercel, senza eseguire funzioni
    return [
      // Il sito è pubblico: la vecchia pagina "coming soon" rimanda alla home
      { source: "/coming-soon/:path*", destination: "/", permanent: true },
      // Le classifiche ora sono nelle pagine delle competizioni
      { source: "/classifica", destination: "/competizioni", permanent: true },
    ];
  },
  async rewrites() {
    // Le immagini caricate dall'admin stanno nel bucket "media" di Supabase,
    // ma vengono servite dal dominio del sito: victoriacasahirta.it/media/...
    return [
      { source: "/media/:path*", destination: `${SUPABASE_URL}/storage/v1/object/public/media/:path*` },
    ];
  },
};

export default nextConfig;
