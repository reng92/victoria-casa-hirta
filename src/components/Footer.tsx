import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-brand-blue text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

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

          {/* Social links */}
          <div className="flex items-center gap-4">
            <a
              href="https://www.facebook.com/victoriacasahirta/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 transition rounded-full p-2.5 flex items-center justify-center"
              aria-label="Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/victoriacasahirta"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 transition rounded-full p-2.5 flex items-center justify-center"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </a>
          </div>

          <div className="text-white/50 text-xs text-center">
            <p>Associazione Sportiva di Fatto Victoria Casa Hirta 2016</p>
            <p>© {new Date().getFullYear()} Tutti i diritti riservati.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
