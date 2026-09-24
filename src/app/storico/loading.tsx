import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento storico">
      <Skeleton className="h-9 w-56 mb-2" />
      <Skeleton className="h-4 w-48 mb-8" />
      <div className="flex items-center gap-2 mb-3 px-1">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16 !rounded-full ml-auto" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bento-card px-4 py-3 flex items-center justify-between gap-3" aria-hidden>
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-14" />
            <Skeleton className="w-7 h-7 !rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
