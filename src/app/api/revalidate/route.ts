import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/** Intervallo minimo tra due rigenerazioni. */
const MIN_INTERVAL_MS = 5_000;
// Per istanza: su Vercel (Fluid) le richieste ravvicinate finiscono di solito
// sulla stessa istanza, quindi basta a evitare raffiche di rigenerazioni.
let lastRun = 0;

/**
 * Aggiorna subito le pagine in cache dopo una modifica dall'admin
 * (altrimenti si aspetta il revalidate e la prima visita vede ancora la
 * versione vecchia). Solo per utenti admin autenticati: 401 se il JWT manca,
 * non è valido o l'utente non è admin; 429 se l'ultima rigenerazione è di
 * meno di 5 secondi fa (Retry-After dice quando riprovare).
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return NextResponse.json({ ok: false }, { status: 401 });

  // Dopo i controlli: chi non è admin non può consumare la finestra
  const wait = lastRun + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: "too_many_requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(wait / 1000)) } }
    );
  }
  lastRun = Date.now();

  const { paths } = (await req.json().catch(() => ({}))) as { paths?: unknown };
  // "*": tutto il sito (dopo qualsiasi scrittura dall'area admin)
  if (Array.isArray(paths) && paths.includes("*")) {
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, revalidated: ["*"] });
  }
  const list = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === "string" && p.startsWith("/")) : [];
  // Le route dinamiche ("/competizioni/[slug]") vanno rigenerate tutte
  for (const p of list.slice(0, 20)) {
    if (p.includes("[")) revalidatePath(p, "page");
    else revalidatePath(p);
  }

  return NextResponse.json({ ok: true, revalidated: list });
}
