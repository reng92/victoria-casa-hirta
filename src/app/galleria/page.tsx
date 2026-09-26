import { supabase } from "@/lib/supabase";
import { Camera } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import PhotoGrid from "@/components/PhotoGrid";
import { getOpponent } from "@/lib/competitions";
import { formatDateShort } from "@/lib/format";

export const revalidate = 60;

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  match: { home_team: string; away_team: string; is_home: boolean; match_date: string } | null;
}

async function getGallery(): Promise<Photo[]> {
  const { data } = await supabase
    .from("gallery")
    .select("id, photo_url, caption, created_at, match:matches(home_team, away_team, is_home, match_date)")
    .order("created_at", { ascending: false });
  return (data as unknown as Photo[]) ?? [];
}

function matchLabel(m: NonNullable<Photo["match"]>) {
  const opponent = getOpponent(m);
  const teams = m.is_home ? `Victoria Casa Hirta – ${opponent}` : `${opponent} – Victoria Casa Hirta`;
  return `${teams} · ${formatDateShort(m.match_date)}`;
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

      <PhotoGrid
        priorityCount={4}
        photos={photos.map((p) => ({
          id: p.id,
          src: p.photo_url,
          caption: p.caption,
          label: p.match ? matchLabel(p.match) : null,
        }))}
      />
    </div>
  );
}
