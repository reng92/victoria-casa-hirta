import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento staff">
      <Skeleton className="h-9 w-40 mb-2" />
      <Skeleton className="h-4 w-56 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bento-card p-5 flex flex-col items-center gap-3" aria-hidden>
            <Skeleton className="w-20 h-20 !rounded-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-5 w-1/2 !rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
