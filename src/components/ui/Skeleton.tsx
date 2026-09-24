/** Blocco skeleton con shimmer; accetta classi per dimensioni. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3" style={{ width: `${100 - i * 18}%` }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bento-card p-5 ${className}`} aria-hidden>
      <div className="skeleton h-3 w-24 mb-4" />
      <div className="skeleton h-6 w-3/4 mb-3" />
      <SkeletonText lines={2} />
    </div>
  );
}
