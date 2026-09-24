import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

/** Stato vuoto con icona e testo. */
export default function EmptyState({ icon: Icon = Inbox, title, description, compact = false, className = "" }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-6 px-4" : "py-12 px-6"} ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted" aria-hidden />
      </div>
      <p className="font-semibold text-text text-sm">{title}</p>
      {description && <p className="text-muted text-xs mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
