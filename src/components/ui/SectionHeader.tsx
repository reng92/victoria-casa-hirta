import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  icon?: LucideIcon;
  href?: string;
  hrefLabel?: string;
  eyebrow?: string;
  className?: string;
}

/** Intestazione di una card/sezione: titolo, icona e link "vedi tutto". */
export default function SectionHeader({ title, icon: Icon, href, hrefLabel = "Tutto", eyebrow, className = "" }: Props) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <span className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-brand-soft" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">{eyebrow}</p>}
          <h2 className="font-display text-base font-bold leading-tight truncate">{title}</h2>
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent-soft hover:text-text transition shrink-0"
        >
          {hrefLabel}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
