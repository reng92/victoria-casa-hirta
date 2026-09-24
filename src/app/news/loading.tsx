import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento news">
      <Skeleton className="h-9 w-28 mb-2" />
      <Skeleton className="h-4 w-56 mb-8" />
      <div className="flex flex-col gap-4 md:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bento-card flex flex-col sm:flex-row" aria-hidden>
            <Skeleton className="aspect-[16/9] sm:aspect-auto sm:w-56 md:w-64 sm:min-h-[150px] !rounded-none shrink-0" />
            <div className="p-5 flex-1 flex flex-col justify-center gap-3">
              <Skeleton className="h-5 w-40 !rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
