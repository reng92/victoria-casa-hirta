import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

/**
 * Le pagine pubbliche sono in cache (ISR, 5 minuti). Ogni scrittura fatta
 * dall'area admin (tabelle o file dello storage) chiede di rigenerare tutto il
 * sito, così le modifiche si vedono subito. Più scritture ravvicinate
 * (es. partita + marcatori + formazione) diventano una sola richiesta.
 */
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function isAdminWrite(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof window === "undefined" || !window.location.pathname.startsWith("/adminwebapp")) return false;
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method === "GET" || method === "HEAD") return false;
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  // Le RPC dell'admin sono solo letture (is_admin, mvp_results)
  return (url.includes("/rest/v1/") && !url.includes("/rest/v1/rpc/")) || url.includes("/storage/v1/object");
}

const trackedFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if (res.ok && isAdminWrite(input, init)) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      import("@/lib/revalidate").then(({ refreshPages }) => refreshPages(["*"]));
    }, 1500);
  }
  return res;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: trackedFetch } });
