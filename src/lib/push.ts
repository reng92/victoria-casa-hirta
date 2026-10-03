import { supabase } from "@/lib/supabase";

// Iscrizione alle notifiche push dal browser, senza account: l'iscrizione
// si salva e si cancella con le funzioni SQL push_subscribe/push_unsubscribe.

export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** Piattaforma per le statistiche anonime; gli iPad recenti si presentano come Mac. */
export function detectPlatform(): "android" | "ios" | "pc" {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (isIos() || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "pc";
}

const PLATFORM_SAVED = "vch-push-platform";

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js");
}

/** True se l'iscrizione è stata fatta con la chiave pubblica attuale del server. */
function sameKey(sub: PushSubscription, key: string) {
  const current = sub.options.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  const b = urlBase64ToUint8Array(key);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/**
 * Iscrive il browser e salva l'iscrizione. Un'iscrizione fatta con una chiave
 * VAPID precedente non riceverebbe più nulla: si cancella e si rifà.
 */
async function subscribe(reg: ServiceWorkerRegistration, key: string) {
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) {
    await supabase.rpc("push_unsubscribe", { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
  const json = sub.toJSON();
  const { error } = await supabase.rpc("push_subscribe", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_platform: detectPlatform(),
    p_standalone: isStandalone(),
  });
  if (error) {
    await sub.unsubscribe();
    throw new Error(error.message);
  }
  try { localStorage.setItem(PLATFORM_SAVED, "1"); } catch {}
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!reg || !sub) return "off";
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (key && Notification.permission === "granted" && !sameKey(sub, key)) {
    // Chiavi cambiate sul server: si rinnova senza chiedere nulla all'utente
    try {
      await subscribe(reg, key);
    } catch {
      return "off";
    }
  } else if (key && Notification.permission === "granted") {
    // Iscrizioni fatte prima delle statistiche: si salva una volta la piattaforma
    let saved = true;
    try { saved = localStorage.getItem(PLATFORM_SAVED) === "1"; } catch {}
    if (!saved) subscribe(reg, key).catch(() => {});
  }
  return "on";
}

export async function enablePush(): Promise<PushState> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("Notifiche non configurate");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  await registration();
  await subscribe(await navigator.serviceWorker.ready, key);
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.rpc("push_unsubscribe", { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return "off";
}
