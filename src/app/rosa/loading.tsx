import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento rosa">
      <Skeleton className="h-9 w-32 mb-2" />
      <Skeleton className="h-4 w-52 mb-8" />
      <Skeleton className="h-6 w-28 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] !rounded-card" />
        ))}
      </div>
    </div>
  );
}
