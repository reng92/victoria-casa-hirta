import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/seo";
import { matchHref, newsHref, playerHref } from "@/lib/links";
import { competitionHref } from "@/lib/competition-data";

export const revalidate = 3600;

// Le pagine legali sono escluse di proposito: sono in noindex
const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/calendario", priority: 0.9, changeFrequency: "daily" },
  { path: "/competizioni", priority: 0.9, changeFrequency: "daily" },
  { path: "/rosa", priority: 0.8, changeFrequency: "weekly" },
  { path: "/news", priority: 0.8, changeFrequency: "weekly" },
  { path: "/mvp", priority: 0.7, changeFrequency: "weekly" },
  { path: "/cannonieri", priority: 0.7, changeFrequency: "weekly" },
  { path: "/galleria", priority: 0.6, changeFrequency: "weekly" },
  { path: "/storico", priority: 0.5, changeFrequency: "monthly" },
  { path: "/staff", priority: 0.4, changeFrequency: "monthly" },
  { path: "/sponsors", priority: 0.4, changeFrequency: "monthly" },
  { path: "/campi", priority: 0.4, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: competitions }, { data: matches }, { data: players }, { data: news }] = await Promise.all([
    supabase.from("competitions").select("name"),
    supabase.from("matches").select("id, slug, match_date"),
    supabase.from("players").select("id, slug"),
    supabase.from("news").select("id, slug, published_at"),
  ]);

  const url = (path: string) => `${SITE_URL}${path}`;
  return [
    ...STATIC_PAGES.map((p) => ({ url: url(p.path), priority: p.priority, changeFrequency: p.changeFrequency })),
    ...((competitions as { name: string }[]) ?? []).map((c) => ({ url: url(competitionHref(c)), priority: 0.8, changeFrequency: "daily" as const })),
    ...((matches as { id: string; slug: string | null; match_date: string }[]) ?? []).map((m) => ({ url: url(matchHref(m)), lastModified: m.match_date, priority: 0.6 })),
    ...((players as { id: string; slug: string | null }[]) ?? []).map((p) => ({ url: url(playerHref(p)), priority: 0.5 })),
    ...((news as { id: string; slug: string | null; published_at: string }[]) ?? []).map((n) => ({ url: url(newsHref(n)), lastModified: n.published_at, priority: 0.6 })),
  ];
}
