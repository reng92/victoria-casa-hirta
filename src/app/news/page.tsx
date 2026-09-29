import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Badge";
import { formatDateFull } from "@/lib/format";
import { newsHref } from "@/lib/links";

export const revalidate = 60;

interface NewsItem {
  id: string;
  slug: string | null;
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
  return (data as unknown as NewsItem[]) ?? [];
}

export default async function NewsPage() {
  const newsList = await getNews();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title="News" subtitle="Comunicati e aggiornamenti" />

      {newsList.length === 0 && (
        <div className="bento-card">
          <EmptyState icon={Newspaper} title="Nessuna news pubblicata" description="I comunicati della società compariranno qui." />
        </div>
      )}

      <div className="stagger flex flex-col gap-4 md:gap-5">
        {newsList.map((n, i) => (
          <Link key={n.id} href={newsHref(n)} className="bento-card group flex flex-col sm:flex-row">
            <div className="relative aspect-[16/9] sm:aspect-auto sm:w-56 md:w-64 shrink-0 bg-surface-2 overflow-hidden">
              {n.cover_url ? (
                <Image
                  src={n.cover_url}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 256px, (min-width: 640px) 224px, 100vw"
                  priority={i === 0}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 mesh-hero flex items-center justify-center">
                  <Newspaper className="w-8 h-8 text-white/40" aria-hidden />
                </div>
              )}
            </div>
            <div className="p-5 flex flex-col justify-center min-w-0">
              <Pill tone="neutral" className="self-start normal-case tracking-normal mb-2">
                <time dateTime={n.published_at} className="capitalize">{formatDateFull(n.published_at)}</time>
              </Pill>
              <h2 className="font-display text-h3 text-balance group-hover:text-accent-soft transition-colors">{n.title}</h2>
              {n.body && <p className="text-sm text-muted mt-2 leading-relaxed line-clamp-3">{n.body}</p>}
              <span className="text-sm font-semibold text-accent-soft mt-3">Leggi tutto →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
