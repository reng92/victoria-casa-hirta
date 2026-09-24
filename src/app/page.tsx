import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import NextMatch from "@/components/NextMatch";
import LastResult from "@/components/home/LastResult";
import MiniStandings from "@/components/home/MiniStandings";
import TopScorers from "@/components/home/TopScorers";
import UpcomingMatches from "@/components/home/UpcomingMatches";
import LatestNews from "@/components/home/LatestNews";
import SponsorMarquee, { type SponsorItem } from "@/components/SponsorMarquee";
import Reveal from "@/components/ui/Reveal";
import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton";

export const revalidate = 60;

async function getSponsors(): Promise<SponsorItem[]> {
  const { data } = await supabase.from("sponsors").select("*").order("name");
  return (data as unknown as SponsorItem[]) ?? [];
}

function HeroSkeleton() {
  return <div className="skeleton rounded-hero min-h-[440px] md:min-h-[420px]" aria-hidden />;
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bento-card p-5 h-full" aria-hidden>
      <div className="skeleton h-4 w-32 mb-5" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 !rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const sponsors = await getSponsors();

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 md:pt-6 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Hero prossima partita */}
        <Reveal index={0} className="md:col-span-4 xl:col-span-6">
          <Suspense fallback={<HeroSkeleton />}>
            <NextMatch />
          </Suspense>
        </Reveal>

        {/* Ultimo risultato */}
        <Reveal index={1} className="md:col-span-2 xl:col-span-2 min-h-[220px]">
          <Suspense fallback={<SkeletonCard className="h-full" />}>
            <LastResult />
          </Suspense>
        </Reveal>

        {/* Classifica compatta */}
        <Reveal index={2} className="md:col-span-2 xl:col-span-2 min-h-[220px]">
          <Suspense fallback={<ListSkeleton rows={4} />}>
            <MiniStandings />
          </Suspense>
        </Reveal>

        {/* Cannonieri top 3 */}
        <Reveal index={3} className="md:col-span-2 xl:col-span-2 min-h-[220px]">
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <TopScorers />
          </Suspense>
        </Reveal>

        {/* Prossime 3 partite */}
        <Reveal index={4} className="md:col-span-2 xl:col-span-3 min-h-[220px]">
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <UpcomingMatches />
          </Suspense>
        </Reveal>

        {/* Ultima news */}
        <Reveal index={5} className="md:col-span-4 xl:col-span-3 min-h-[220px]">
          <Suspense fallback={<SkeletonCard className="h-full" />}>
            <LatestNews />
          </Suspense>
        </Reveal>

        {/* Sponsor marquee */}
        {sponsors.length > 0 && (
          <Reveal index={6} className="md:col-span-4 xl:col-span-6">
            <SponsorMarquee sponsors={sponsors} />
          </Reveal>
        )}

        {/* Social */}
        <Reveal index={7} className="md:col-span-4 xl:col-span-6">
          <section className="bento-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <h2 className="font-display text-h2">Seguici sui social</h2>
              <p className="text-muted text-sm mt-1">Foto, notizie e risultati in tempo reale.</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/victoriacasahirta/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none text-center bg-brand text-white px-6 py-3 rounded-full font-semibold hover:brightness-125 transition"
              >
                Facebook
              </a>
              <a
                href="https://www.instagram.com/victoriacasahirta"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none text-center bg-accent text-white px-6 py-3 rounded-full font-semibold hover:brightness-110 transition"
              >
                Instagram
              </a>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
