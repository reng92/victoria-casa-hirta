import { supabase } from "@/lib/supabase";

export const revalidate = 60;

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

async function getSponsors(): Promise<Sponsor[]> {
  const { data } = await supabase.from("sponsors").select("*").order("name");
  return (data as Sponsor[]) ?? [];
}

export default async function SponsorsPage() {
  const sponsors = await getSponsors();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">Sponsor</h1>
      <p className="text-gray-500 mb-10 text-sm">
        Grazie a chi ci supporta ogni giorno
      </p>

      {sponsors.length === 0 && (
        <p className="text-gray-400 text-sm">Nessuno sponsor al momento.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {sponsors.map((s) => (
          <a
            key={s.id}
            href={s.website_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-sm hover:shadow-md hover:border-brand-blue transition group"
          >
            <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
              {s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt={s.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-4xl">🏢</span>
              )}
            </div>
            <div className="font-semibold text-brand-blue text-sm text-center group-hover:text-brand-red transition">
              {s.name}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
