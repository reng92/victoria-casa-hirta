import { supabase } from "@/lib/supabase";

export const revalidate = 60;

interface NewsItem {
  id: string;
  title: string;
  body: string | null;
  cover_url: string | null;
  published_at: string;
}

async function getNews(): Promise<NewsItem[]> {
  const { data } = await supabase
    .from("news")
    .select("*")
    .order("published_at", { ascending: false });
  return (data as NewsItem[]) ?? [];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function NewsPage() {
  const newsList = await getNews();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-brand-blue mb-2">News</h1>
      <p className="text-gray-500 mb-10 text-sm">Comunicati e aggiornamenti</p>

      {newsList.length === 0 && (
        <p className="text-gray-400 text-sm">Nessuna news pubblicata al momento.</p>
      )}

      <div className="flex flex-col gap-6">
        {newsList.map((n) => (
          <div key={n.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition flex flex-col sm:flex-row">
            {n.cover_url ? (
              <img src={n.cover_url} alt={n.title} className="w-full sm:w-48 h-40 sm:h-auto object-cover shrink-0" />
            ) : (
              <div className="w-full sm:w-48 h-24 sm:h-auto bg-brand-blue/10 flex items-center justify-center text-4xl shrink-0">
                📰
              </div>
            )}
            <div className="p-5 flex flex-col justify-center">
              <p className="text-xs text-brand-red font-semibold uppercase tracking-wide mb-1">
                {formatDate(n.published_at)}
              </p>
              <h2 className="font-bold text-brand-blue text-lg mb-2">{n.title}</h2>
              {n.body && (
                <p className="text-sm text-gray-500 line-clamp-3">{n.body}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
