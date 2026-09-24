import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { MapPin, Navigation, Landmark } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Badge";

export const revalidate = 60;

interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  maps_url: string | null;
  photo_url: string | null;
}

async function getVenues(): Promise<Venue[]> {
  const { data } = await supabase
    .from("venues")
    .select("*")
    .order("name", { ascending: true });
  return (data as unknown as Venue[]) ?? [];
}

export default async function CampiPage() {
  const venues = await getVenues();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Campi" subtitle="Dove giochiamo" />

      {venues.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={Landmark} title="Nessun campo disponibile" description="I campi verranno caricati a breve." />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {venues.map((v) => (
          <article key={v.id} className="bento-card flex flex-col">
            <div className="relative aspect-[16/9] bg-surface-2 overflow-hidden">
              {v.photo_url ? (
                <Image
                  src={v.photo_url}
                  alt={v.name}
                  fill
                  sizes="(min-width:640px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 mesh-hero flex items-center justify-center">
                  <Landmark className="w-10 h-10 text-white/30" aria-hidden />
                </div>
              )}
            </div>
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-h3 text-balance">{v.name}</h2>
                {v.city && <Pill tone="brand" className="shrink-0">{v.city}</Pill>}
              </div>
              {v.address && (
                <p className="inline-flex items-start gap-2 text-sm text-muted">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                  <span>{v.address}</span>
                </p>
              )}
              {v.maps_url && (
                <a
                  href={v.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center justify-center gap-2 self-start rounded-full bg-accent text-white font-semibold px-4 py-2.5 text-sm hover:brightness-110 transition"
                >
                  <Navigation className="w-4 h-4" aria-hidden />
                  Apri su Maps
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
