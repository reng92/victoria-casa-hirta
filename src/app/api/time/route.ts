import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Ora del server: il conto alla rovescia dell'MVP non si fida dell'orologio del telefono. */
export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
