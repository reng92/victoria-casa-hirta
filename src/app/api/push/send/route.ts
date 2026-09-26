import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Subscription { endpoint: string; p256dh: string; auth: string; }

/**
 * Invia una notifica push a tutti i browser iscritti e la salva nello storico.
 * Solo per admin: le iscrizioni si leggono con il token dell'admin (RLS).
 */
export async function POST(req: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Chiavi VAPID non configurate sul server" }, { status: 500 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const input = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const title = str(input.title);
  if (!title) return NextResponse.json({ error: "Il titolo è obbligatorio" }, { status: 400 });
  const body = str(input.body);
  const imageUrl = str(input.image_url);
  const url = str(input.url);
  const matchId = str(input.match_id);
  if (url && !url.startsWith("/") && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Il link deve iniziare con https:// oppure /" }, { status: 400 });
  }

  // Il payload push ha un limite di circa 4 KB: il testo lungo si tronca
  const payload = JSON.stringify({
    title: title.slice(0, 120),
    body: body && body.length > 1000 ? body.slice(0, 999) + "…" : body,
    image: imageUrl,
    url: url ?? "/",
  });

  const { data: subs, error: subsError } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@victoriacasahirta.it", publicKey, privateKey);

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];
  const list = (subs ?? []) as Subscription[];
  // A blocchi per non aprire centinaia di connessioni insieme
  for (let i = 0; i < list.length; i += 50) {
    await Promise.all(
      list.slice(i, i + 50).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: 60 * 60 * 24,
            // Con urgenza "normal" Android in risparmio energetico trattiene il messaggio anche per ore
            urgency: "high",
          });
          sent++;
        } catch (err) {
          failed++;
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410: il browser ha revocato l'iscrizione
          if (status === 404 || status === 410) expired.push(s.endpoint);
        }
      })
    );
  }
  if (expired.length) await supabase.from("push_subscriptions").delete().in("endpoint", expired);

  const { error: logError } = await supabase.from("notifications").insert({
    title,
    body,
    image_url: imageUrl,
    url,
    match_id: matchId,
    sent_count: sent,
    failed_count: failed,
  });

  return NextResponse.json({ sent, failed, removed: expired.length, logError: logError?.message ?? null });
}
