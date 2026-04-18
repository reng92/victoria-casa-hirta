import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password === "vch2026") {
    const res = NextResponse.json({ success: true });
    res.cookies.set("vch-bypass", "1", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return res;
  }
  return NextResponse.json({ success: false }, { status: 401 });
}
