import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { Handshake, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { initials } from "@/lib/format";

export const revalidate = 60;

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

async function getSponsors(): Promise<Sponsor[]> {
  const { data } = await supabase.from("sponsors").select("*").order("name");
  return (data as unknown as Sponsor[]) ?? [];
}

function SponsorCard({ s }: { s: Sponsor }) {
  const inner = (
    <>
      <div className="relative aspect-[3/2] bg-white overflow-hidden">
        {s.logo_url ? (
          <Image
            src={s.logo_url}
            alt={s.name}
            fill
            sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-5 grayscale group-hover:grayscale-0 transition duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-3xl font-bold text-brand-blue">{initials(s.name)}</span>
          </div>
        )}
      </div>
      <div className="p-4 flex items-center justify-between gap-2">
        <p className="font-semibold text-sm truncate">{s.name}</p>
        {s.website_url && <ExternalLink className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden />}
      </div>
    </>
  );

  if (s.website_url) {
    return (
      <a
        href={s.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="group bento-card block hover:bg-surface-2/60 transition focus-visible:ring-2 focus-visible:ring-brand-soft"
        aria-label={`${s.name} (sito esterno)`}
      >
        {inner}
      </a>
    );
  }
  return <div className="group bento-card">{inner}</div>;
}

export default async function SponsorsPage() {
  const sponsors = await getSponsors();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Sponsor" subtitle="Grazie a chi ci supporta ogni giorno" />

      {sponsors.length === 0 ? (
        <div className="bento-card">
          <EmptyState icon={Handshake} title="Nessuno sponsor al momento" description="Vuoi sostenere la squadra? Contattaci sui social." />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {sponsors.map((s) => (
            <SponsorCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
