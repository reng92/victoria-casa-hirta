import { supabase } from "@/lib/supabase";

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
  return (data as Venue[]) ?? [];
}

export default async function CampiPage() {
  const venues = await getVenues();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Campi</h1>
      <p className="text-gray-500 mb-10 text-sm">Dove giochiamo</p>

      {venues.length === 0 && (
        <p className="text-gray-400 text-sm">I campi verranno caricati a breve.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {venues.map((v) => (
          <div key={v.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition">
            {v.photo_url ? (
              <img src={v.photo_url} alt={v.name} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-4xl">🏟️</div>
            )}
            <div className="p-5">
              <h2 className="font-bold text-brand-blue text-lg mb-1">{v.name}</h2>
              {v.city && <p className="text-xs text-brand-red font-semibold uppercase tracking-wide mb-2">{v.city}</p>}
              {v.address && <p className="text-sm text-gray-500 mb-4">📍 {v.address}</p>}
              {v.maps_url && (
                <a
                  href={v.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-semibold text-white bg-brand-blue px-4 py-2 rounded-full hover:opacity-90 transition"
                >
                  Apri su Maps →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
