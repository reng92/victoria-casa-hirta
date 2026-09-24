import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateNumeric } from "@/lib/format";

interface NewsItem {
  id: string;
  title: string;
  body: string | null;
  cover_url: string | null;
  published_at: string;
}

async function getLatest(): Promise<NewsItem | null> {
  const { data } = await supabase
    .from("news")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(1)
    .single();
  return data as unknown as NewsItem | null;
}

export default async function LatestNews() {
  const n = await getLatest();

  return (
    <div className="bento-card h-full flex flex-col">
      <div className="p-5 pb-0">
        <SectionHeader title="Ultima news" icon={Newspaper} href="/news" hrefLabel="Tutte" />
      </div>
      {!n ? (
        <EmptyState compact title="Nessuna news" description="I comunicati compariranno qui." />
      ) : (
        <Link href="/news" className="flex-1 flex flex-col mt-4 group">
          <div className="relative aspect-[16/9] bg-surface-2 overflow-hidden">
            {n.cover_url ? (
              <Image
                src={n.cover_url}
                alt=""
                fill
                sizes="(min-width: 1280px) 40vw, (min-width: 768px) 60vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="absolute inset-0 mesh-hero" aria-hidden />
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
            <p className="absolute left-4 bottom-3 text-[11px] font-semibold uppercase tracking-wider text-white/80">
              {formatDateNumeric(n.published_at)}
            </p>
          </div>
          <div className="p-5 pt-4">
            <h3 className="font-display text-h3 leading-snug text-balance">{n.title}</h3>
            {n.body && <p className="text-sm text-muted mt-2 line-clamp-3">{n.body}</p>}
          </div>
        </Link>
      )}
    </div>
  );
}
