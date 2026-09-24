import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento classifica">
      <Skeleton className="h-9 w-44 mb-2" />
      <Skeleton className="h-4 w-56 mb-8" />
      <Skeleton className="h-6 w-40 mb-3" />
      <div className="bento-card p-4 flex flex-col gap-3" aria-hidden>
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
