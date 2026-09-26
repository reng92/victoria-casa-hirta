import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento giocatore">
      <Skeleton className="h-4 w-16 mb-4" />
      <Skeleton className="h-9 w-56 mb-8" />
      <Skeleton className="!rounded-hero min-h-[180px] mb-4" />
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 !rounded-card" />
        ))}
      </div>
      <div className="bento-card p-5 flex flex-col gap-3" aria-hidden>
        <Skeleton className="h-4 w-32 mb-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
