import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/**
 * Aggiorna subito le pagine in cache dopo una modifica dall'admin
 * (altrimenti si aspetta il revalidate di 60s e la prima visita vede
 * ancora la versione vecchia). Solo per utenti admin autenticati.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { paths } = (await req.json().catch(() => ({}))) as { paths?: unknown };
  const list = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === "string" && p.startsWith("/")) : [];
  for (const p of list.slice(0, 20)) revalidatePath(p);

  return NextResponse.json({ ok: true, revalidated: list });
}
