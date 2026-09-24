import { SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 md:pt-6 pb-8" aria-busy="true" aria-label="Caricamento">
      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="skeleton rounded-hero min-h-[440px] md:min-h-[420px] md:col-span-4 xl:col-span-6" />
        <SkeletonCard className="md:col-span-2 xl:col-span-2 min-h-[220px]" />
        <SkeletonCard className="md:col-span-2 xl:col-span-2 min-h-[220px]" />
        <SkeletonCard className="md:col-span-2 xl:col-span-2 min-h-[220px]" />
        <SkeletonCard className="md:col-span-2 xl:col-span-3 min-h-[220px]" />
        <SkeletonCard className="md:col-span-4 xl:col-span-3 min-h-[220px]" />
      </div>
    </div>
  );
}
