import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento MVP del mese">
      <Skeleton className="h-9 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] !rounded-card" />
        ))}
      </div>
    </div>
  );
}
