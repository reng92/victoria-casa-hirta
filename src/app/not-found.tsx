import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <Image
        src="/logo.png"
        alt="Victoria Casa Hirta"
        width={80}
        height={80}
        className="mb-6 rounded-full opacity-50"
      />
      <h1 className="text-6xl font-extrabold text-brand-blue mb-2">404</h1>
      <p className="text-gray-500 mb-8">Questa pagina non esiste.</p>
      <Link
        href="/"
        className="bg-brand-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition"
      >
        Torna alla home
      </Link>
    </div>
  );
}
