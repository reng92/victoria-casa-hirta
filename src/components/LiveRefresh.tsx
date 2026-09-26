"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Ricarica i dati server della pagina partita quando cambiano punteggio,
 * eventi o cronaca live (realtime). Non renderizza nulla.
 */
export default function LiveRefresh({ matchId }: { matchId: string }) {
  const router = useRouter();

  useEffect(() => {
    const filter = `match_id=eq.${matchId}`;
    const channel = supabase
      .channel(`match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events", filter }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_commentary", filter }, () => router.refresh())
      .subscribe();
    // Fallback se il realtime non è abilitato su qualche tabella
    const interval = setInterval(() => router.refresh(), 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [matchId, router]);

  return null;
}
