import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { ArrowLeft, Newspaper } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isUuid, newsHref } from "@/lib/links";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Badge";
import { formatDateFull } from "@/lib/format";

export const revalidate = 60;

interface NewsItem {
  id: string;
  slug: string | null;
  title: string;
  body: string | null;
  cover_url: string | null;
  published_at: string;
}

// Condivisa tra generateMetadata e la pagina: una sola query per richiesta
const getNews = cache(async (key: string): Promise<NewsItem | null> => {
  const { data } = await supabase
    .from("news")
    .select("id, slug, title, body, cover_url, published_at")
    .eq(isUuid(key) ? "id" : "slug", key)
    .maybeSingle();
  return data as unknown as NewsItem | null;
});

// Anteprima del link condiviso su WhatsApp e social
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const n = await getNews(params.slug);
  if (!n) return { title: "News non trovata · Victoria Casa Hirta" };
  const description = n.body ? n.body.replace(/\s+/g, " ").trim().slice(0, 160) : "News della Victoria Casa Hirta";
  return {
    title: `${n.title} · Victoria Casa Hirta`,
    description,
    alternates: { canonical: newsHref(n) },
    openGraph: {
      type: "article",
      title: n.title,
      description,
      url: newsHref(n),
      publishedTime: n.published_at,
      ...(n.cover_url ? { images: [{ url: n.cover_url }] } : {}),
    },
  };
}

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  const n = await getNews(params.slug);
  if (!n) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <div className="bento-card">
          <EmptyState icon={Newspaper} title="News non trovata" description="La news richiesta non esiste o è stata rimossa." />
          <div className="pb-8 text-center">
            <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-soft hover:text-text transition">
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Torna alle news
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Link con l'UUID: redirect permanente all'URL leggibile
  if (n.slug && params.slug !== n.slug) permanentRedirect(newsHref(n));

  return (
    <article className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title={n.title} back={{ href: "/news", label: "Tutte le news" }} />

      <Pill tone="neutral" className="normal-case tracking-normal -mt-2 mb-5 md:mb-6">
        <time dateTime={n.published_at} className="capitalize">{formatDateFull(n.published_at)}</time>
      </Pill>

      {n.cover_url && (
        <div className="bento-card mb-5 md:mb-6 bg-surface-2">
          {/* Foto intera nelle sue proporzioni, senza ritagli */}
          <Image
            src={n.cover_url}
            alt=""
            width={1600}
            height={900}
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="w-full h-auto"
          />
        </div>
      )}

      {n.body && (
        <div className="bento-card p-5 md:p-7">
          <p className="text-base leading-relaxed whitespace-pre-line">{n.body}</p>
        </div>
      )}
    </article>
  );
}
