const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qhzlqmiddvhyjvtlgysc.supabase.co";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Niente Image Optimization di Vercel: il piano gratuito ha solo 5.000
    // trasformazioni al mese. Le foto vengono compresse al caricamento (lib/storage.ts).
    unoptimized: true,
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
