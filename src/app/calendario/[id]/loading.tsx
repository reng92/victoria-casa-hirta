import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10" aria-busy="true" aria-label="Caricamento partita">
      <Skeleton className="h-4 w-20 mb-6" />
      <Skeleton className="!rounded-hero h-[320px] mb-6" />
      <Skeleton className="h-11 w-full mb-5" />
      <Skeleton className="h-64 !rounded-card" />
    </div>
  );
}
