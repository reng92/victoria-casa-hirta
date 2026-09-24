import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento partite">
      <Skeleton className="h-9 w-40 mb-2" />
      <Skeleton className="h-4 w-64 mb-8" />
      <Skeleton className="h-11 w-full sm:w-64 !rounded-full mb-5" />
      <Skeleton className="h-3 w-32 mb-2" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bento-card p-3 sm:p-4 flex items-center gap-3" aria-hidden>
            <Skeleton className="w-12 h-14 shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
            <Skeleton className="w-16 h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
