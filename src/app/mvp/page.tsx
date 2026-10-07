import Image from "next/image";
import Link from "next/link";
import { Award, Crown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import MvpOfMonth from "@/components/MvpOfMonth";
import { featuredPoll, getMvpPolls, getMvpWinners } from "@/lib/mvp-data";
import { monthLabel } from "@/lib/mvp";
import { initials } from "@/lib/format";
import { playerHref } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "MVP del mese",
  description: "Vota il miglior giocatore del mese della Victoria Casa Hirta e scopri l'albo d'oro degli MVP.",
  path: "/mvp",
});

export default async function MvpPage() {
  const now = Date.now();
  const polls = await getMvpPolls();
  const featured = featuredPoll(polls, now);
  const winners = await getMvpWinners(polls, now);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="MVP del mese" subtitle="Scegli tra i candidati il migliore del mese: un voto per dispositivo." />

      {!featured ? (
        <div className="bento-card">
          <EmptyState icon={Award} title="Nessuna votazione" description="La prossima votazione per l'MVP del mese comparirà qui." />
        </div>
      ) : (
        <MvpOfMonth poll={featured} renderedAt={now} />
      )}

      {winners.length > 0 && (
        <section className="mt-10" aria-labelledby="albo-mvp">
          <h2 id="albo-mvp" className="font-display text-h3 mb-4">Albo d&apos;oro</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {winners.flat().map(({ poll, player, votes }) => (
              <li key={`${poll.id}-${player.id}`}>
                <Link href={playerHref(player)} className="bento-card tap flex items-center gap-4 p-3">
                  <span className="relative w-16 h-20 rounded-xl overflow-hidden bg-surface-2 shrink-0">
                    {player.photo_url ? (
                      <Image src={player.photo_url} alt={player.full_name} fill sizes="64px" className="object-cover object-top" />
                    ) : (
                      <span className="absolute inset-0 mesh-hero flex items-center justify-center font-display font-bold text-white/40">
                        {initials(player.full_name)}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-draw">
                      <Crown className="w-3.5 h-3.5" aria-hidden /> {monthLabel(poll.month)}
                    </span>
                    <span className="block font-display font-bold leading-tight mt-0.5">{player.full_name}</span>
                    <span className="block text-xs text-muted mt-0.5 tabular">{votes} {votes === 1 ? "voto" : "voti"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
