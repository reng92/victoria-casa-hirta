import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4 py-12 text-center">
      <Image
        src="/logo.jpeg"
        alt=""
        width={80}
        height={80}
        className="mb-6 rounded-full ring-2 ring-white/10 opacity-60"
      />
      <h1 className="font-display text-display text-accent-soft">404</h1>
      <p className="text-muted mt-3 mb-8 max-w-xs text-balance">
        Questa pagina non esiste o è stata spostata.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-accent text-white font-semibold px-6 py-3 text-sm hover:brightness-110 transition"
      >
        <Home className="w-4 h-4" aria-hidden />
        Torna alla home
      </Link>
    </div>
  );
}
