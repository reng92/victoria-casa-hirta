import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

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
  matcher: ["/admin/:path*"],
};
