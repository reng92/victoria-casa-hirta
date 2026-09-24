import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento galleria">
      <Skeleton className="h-9 w-36 mb-2" />
      <Skeleton className="h-4 w-56 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square !rounded-card" />
        ))}
      </div>
    </div>
  );
}
