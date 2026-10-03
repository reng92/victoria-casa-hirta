/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Niente Image Optimization di Vercel: il piano gratuito ha solo 5.000
    // trasformazioni al mese. Le foto vengono compresse al caricamento (lib/storage.ts).
    unoptimized: true,
  },
};

export default nextConfig;
