export default function Footer() {
  return (
    <footer className="bg-brand-blue text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div className="font-bold text-lg tracking-wide">
          <span className="text-brand-red">VCH</span> Victoria Casa Hirta
        </div>
        <p className="text-white/60 text-xs">
          © {new Date().getFullYear()} Victoria Casa Hirta. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  );
}
