import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Routes that bypass the coming-soon wall
  const isPublic =
    pathname.startsWith("/coming-soon") ||
    pathname.startsWith("/api/unlock") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.(jpeg|jpg|png|svg|ico|webp|gif|woff2?|ttf)$/.test(pathname);

  if (!isPublic) {
    const bypassCookie = req.cookies.get("vch-bypass")?.value;
    if (!bypassCookie) {
      return NextResponse.redirect(new URL("/coming-soon", req.url));
    }
  }

  // Admin auth
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";

  if (isAdminRoute && !isLoginPage) {
    const adminCookie = req.cookies.get("vch-admin")?.value;
    const hasSupabaseSession = [...req.cookies.getAll()].some(c =>
      c.name.includes("supabase") || c.name.includes("sb-")
    );
    if (!adminCookie && !hasSupabaseSession) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
