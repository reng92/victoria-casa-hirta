import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { match_id, player_id } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  const { data: existing } = await supabase
    .from("match_votes")
    .select("id")
    .eq("match_id", match_id)
    .eq("voter_ip", ip)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Hai già votato per questa partita" }, { status: 400 });
  }

  const { error } = await supabase.from("match_votes").insert({
    match_id,
    player_id,
    voter_ip: ip,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
