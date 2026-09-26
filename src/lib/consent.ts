// Consenso cookie (GDPR / Linee guida Garante privacy 2021).
// Salvato in un cookie tecnico di prima parte + localStorage, dura 6 mesi:
// scaduto (o cambiata la versione) il banner viene riproposto.

export type ConsentCategory = "analytics" | "external";

export interface Consent {
  necessary: true;
  analytics: boolean;
  external: boolean;
  /** ISO date della scelta */
  date: string;
  version: number;
}

export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_DAYS = 180;
const KEY = "vch-consent";
export const CONSENT_EVENT = "vch-consent-change";
export const OPEN_SETTINGS_EVENT = "vch-open-cookie-settings";

export const GA_ID = "G-EMQ7TQWP87";

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY) ?? readCookie(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    if (c.version !== CONSENT_VERSION) return null;
    const ageDays = (Date.now() - new Date(c.date).getTime()) / 86_400_000;
    if (!(ageDays >= 0 && ageDays < CONSENT_MAX_AGE_DAYS)) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean; external: boolean }): Consent {
  const c: Consent = { necessary: true, ...choice, date: new Date().toISOString(), version: CONSENT_VERSION };
  const raw = JSON.stringify(c);
  try { localStorage.setItem(KEY, raw); } catch {}
  document.cookie = `${KEY}=${encodeURIComponent(raw)}; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  if (!c.analytics) removeAnalyticsCookies();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
  return c;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Alla revoca del consenso cancella i cookie _ga / _ga_* di Google Analytics. */
function removeAnalyticsCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const part of document.cookie.split("; ")) {
    const name = part.split("=")[0];
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
      for (const d of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ""}`;
      }
    }
  }
}
