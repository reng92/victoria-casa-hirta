import { supabase } from "@/lib/supabase";

/** Chiede al server di rigenerare subito le pagine indicate (usato dall'admin). */
export async function refreshPages(paths: string[]) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paths }),
    });
  } catch {
    // Non bloccante: al massimo la pagina si aggiorna col revalidate da 60s
  }
}
