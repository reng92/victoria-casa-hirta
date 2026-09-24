import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { Camera } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export const revalidate = 60;

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  match: { home_team: string; away_team: string; match_date: string } | null;
}

async function getGallery(): Promise<Photo[]> {
  const { data } = await supabase
    .from("gallery")
    .select("id, photo_url, caption, created_at, match:matches(home_team, away_team, match_date)")
    .order("created_at", { ascending: false });
  return (data as unknown as Photo[]) ?? [];
}

export default async function GalleriaPage() {
  const photos = await getGallery();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="Galleria" subtitle={`Foto e momenti della squadra${photos.length ? ` · ${photos.length} foto` : ""}`} />

      {photos.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={Camera} title="Nessuna foto" description="Le foto verranno caricate a breve." />
        </div>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((p, i) => (
          <li key={p.id} className="group relative aspect-square rounded-card overflow-hidden bg-surface-2 border border-border">
            <Image
              src={p.photo_url}
              alt={p.caption ?? "Foto della squadra"}
              fill
              sizes="(min-width:768px) 25vw, (min-width:640px) 33vw, 50vw"
              priority={i < 4}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {p.caption && (
              <div
                className="absolute inset-x-0 bottom-0 pt-10 pb-2.5 px-3 bg-gradient-to-t from-black/75 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
              >
                <p className="text-white text-xs font-medium leading-snug line-clamp-2">{p.caption}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
