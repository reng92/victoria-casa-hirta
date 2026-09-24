import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento campi">
      <Skeleton className="h-9 w-32 mb-2" />
      <Skeleton className="h-4 w-40 mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bento-card" aria-hidden>
            <Skeleton className="aspect-[16/9] w-full !rounded-none" />
            <div className="p-5 flex flex-col gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-9 w-32 !rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
