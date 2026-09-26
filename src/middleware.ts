import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Il sito è pubblico: la vecchia pagina "coming soon" rimanda alla home
  if (pathname.startsWith("/coming-soon")) {
    return NextResponse.redirect(new URL("/", req.url), 308);
  }

  // Vecchi URL con l'UUID di partite e giocatori: 308 verso lo slug leggibile.
  // La pagina reindirizza anche da sola, ma con lo streaming risponderebbe 200.
  const legacy = pathname.match(/^\/(calendario|rosa)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i);
  if (legacy) {
    const slug = await lookupSlug(legacy[1] === "calendario" ? "matches" : "players", legacy[2]);
    if (slug) return NextResponse.redirect(new URL(`/${legacy[1]}/${slug}`, req.url), 308);
  }

  // Admin auth
  const isAdminRoute = pathname.startsWith("/adminwebapp");
  // Login e recupero password sono raggiungibili senza sessione: il link di
  // recupero porta i token nel frammento dell'URL, che il server non vede.
  const isAuthPage = pathname === "/adminwebapp/login" || pathname === "/adminwebapp/reset-password";

  if (isAdminRoute && !isAuthPage) {
    const adminCookie = req.cookies.get("vch-admin")?.value;
    const hasSupabaseSession = [...req.cookies.getAll()].some(c =>
      c.name.includes("supabase") || c.name.includes("sb-")
    );
    if (!adminCookie && !hasSupabaseSession) {
      return NextResponse.redirect(new URL("/adminwebapp/login", req.url));
    }
  }

  return NextResponse.next();
}

async function lookupSlug(table: "matches" | "players", id: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=slug`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { slug: string | null }[];
    return rows[0]?.slug ?? null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
