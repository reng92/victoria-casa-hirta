import { cache } from "react";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { isUuid, matchHref } from "@/lib/links";
import { Suspense } from "react";
import WeatherWidget from "@/components/WeatherWidget";
import MatchView, { type Match, type Photo } from "@/components/match/MatchView";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateFull, formatTime } from "@/lib/format";
import { getHomeAwayScores, getOpponent, matchContextLabel, matchResultNote } from "@/lib/competitions";
import { MATCH_SELECT, fetchLiveState } from "@/lib/live-match";
import { excerpt, pageMetadata } from "@/lib/seo";

export const revalidate = 0;

// Condivisa tra generateMetadata e la pagina: una sola query per richiesta
const getMatch = cache(async (key: string): Promise<Match | null> => {
  const column = isUuid(key) ? "id" : "slug";
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq(column, key)
    .single();
  if (error) {
    // Fallback senza group_name / instagram_reels se le colonne non esistono ancora
    const { data: fallback } = await supabase
      .from("matches")
      .select("id, slug, match_date, home_team, away_team, is_home, home_score, away_score, status, matchday, notes, opponent_logo_url, live_minute, live_period, venue:venues(name, address, city, maps_url), competition:competitions(name, type, level)")
      .eq(column, key)
      .single();
    return fallback as unknown as Match | null;
  }
  return data as unknown as Match | null;
});

// Anteprima del link condiviso: "Victoria Casa Hirta 6-1 Falegnameria Cosenza" e la foto di copertina della partita
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const m = await getMatch(params.slug);
  if (!m) return { title: "Partita non trovata", robots: { index: false } };
  const opponent = getOpponent(m);
  const [home, away] = m.is_home ? ["Victoria Casa Hirta", opponent] : [opponent, "Victoria Casa Hirta"];
  const scores = getHomeAwayScores(m);
  const played = m.status !== "scheduled" && scores.home != null && scores.away != null;
  const note = played ? matchResultNote(m) : null;
  const title = played ? `${home} ${scores.home}-${scores.away} ${away}${note ? ` (${note})` : ""}` : `${home} - ${away}`;
  const when = `${formatDateFull(m.match_date)}${played ? "" : ` ore ${formatTime(m.match_date)}`}`;
  const where = m.venue ? ` · ${m.venue.name}${m.venue.city ? `, ${m.venue.city}` : ""}` : "";
  const intro = `${matchContextLabel(m)} · ${when}${where}.`;
  const description = excerpt(`${intro} ${played ? excerpt(m.match_report, 110) || "Risultato, marcatori, formazione e foto della partita." : "Orario, campo, formazione e meteo della partita."}`);
  const [cover] = await getPhotos(m.id);
  return pageMetadata({
    title,
    absolute: true,
    description,
    path: matchHref(m),
    type: "article",
    image: cover ? { url: cover.photo_url, alt: `${title}, ${formatDateFull(m.match_date)}` } : null,
  });
}

async function getPhotos(matchId: string): Promise<Photo[]> {
  const { data } = await supabase
    .from("gallery")
    .select("id, photo_url, caption")
    .eq("match_id", matchId)
    .order("is_cover", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as Photo[]) ?? [];
}

export default async function PartitaPage({ params }: { params: { slug: string } }) {
  const match = await getMatch(params.slug);

  if (!match) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bento-card">
          <EmptyState
            title="Partita non trovata"
            description="Il link potrebbe essere errato o la partita è stata rimossa."
          />
          <div className="text-center pb-6">
            <Link href="/calendario" className="text-sm font-semibold text-accent-soft hover:text-text transition">
              Torna al calendario
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Vecchi link con l'UUID: redirect permanente all'URL leggibile
  if (match.slug && params.slug !== match.slug) permanentRedirect(matchHref(match));

  // Stato iniziale completo: poi lo aggiornano i messaggi del canale live
  const [live, photos] = await Promise.all([fetchLiveState(match.id), getPhotos(match.id)]);
  const weather = match.venue?.city ? (
    <Suspense fallback={<div className="skeleton h-40" aria-busy="true" />}>
      <WeatherWidget matchDate={match.match_date} city={match.venue.city} />
    </Suspense>
  ) : null;

  return <MatchView key={match.id} initialMatch={match} initialState={live} photos={photos} weather={weather} />;
}
