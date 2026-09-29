import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento news">
      <Skeleton className="h-4 w-28 mb-4" />
      <Skeleton className="h-9 w-3/4 mb-6" />
      <Skeleton className="h-6 w-48 !rounded-full mb-6" />
      <Skeleton className="aspect-[16/9] !rounded-card mb-6" />
      <div className="bento-card p-5 md:p-7 flex flex-col gap-3" aria-hidden>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
