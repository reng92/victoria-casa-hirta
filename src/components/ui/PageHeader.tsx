import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}

/** Intestazione delle pagine interne. */
export default function PageHeader({ title, subtitle, back, children }: Props) {
  return (
    <header className="mb-6 md:mb-8">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-h1 text-balance">{title}</h1>
          {subtitle && <p className="text-muted text-sm mt-1.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
