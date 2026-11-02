import { supabase } from "@/lib/supabase";

/**
 * Chiede al server di rigenerare subito le pagine indicate (usato dall'admin).
 * Se il server risponde 429 (rigenerazione di meno di 5s fa) riprova una
 * volta dopo il Retry-After, così anche l'ultima modifica si vede subito.
 */
export async function refreshPages(paths: string[], retry = true) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paths }),
    });
    if (res.status === 429 && retry) {
      const seconds = Number(res.headers.get("Retry-After")) || 5;
      setTimeout(() => refreshPages(paths, false), seconds * 1000 + 250);
    }
  } catch {
    // Non bloccante: al massimo la pagina si aggiorna col revalidate
  }
}
