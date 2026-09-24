import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento cannonieri">
      <Skeleton className="h-9 w-44 mb-2" />
      <Skeleton className="h-4 w-64 mb-8" />
      <div className="bento-card p-4 flex flex-col gap-4" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-6 h-6 shrink-0" />
            <Skeleton className={`${i < 3 ? "w-12 h-12" : "w-10 h-10"} !rounded-full shrink-0`} />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
            <Skeleton className="w-10 h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
