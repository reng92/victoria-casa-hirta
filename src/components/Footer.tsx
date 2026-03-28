import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-brand-blue text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpeg"
            alt="Victoria Casa Hirta"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-bold tracking-wide">Victoria Casa Hirta</span>
        </div>
        <p className="text-white/50 text-xs">
          © {new Date().getFullYear()} Victoria Casa Hirta. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  );
}
