import { supabase } from "@/lib/supabase";

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
  return (data as Photo[]) ?? [];
}

export default async function GalleriaPage() {
  const photos = await getGallery();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Galleria</h1>
      <p className="text-gray-500 mb-10 text-sm">Foto e momenti della squadra</p>

      {photos.length === 0 && (
        <p className="text-gray-400 text-sm">Le foto verranno caricate a breve.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
            <img
              src={p.photo_url}
              alt={p.caption ?? "Foto"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {p.caption && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-end p-3">
                <p className="text-white text-xs font-medium">{p.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
