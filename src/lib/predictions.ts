/**
 * Pronostici dei tifosi (migrazione `2026-10-20_pronostici.sql`). Il
 * pronostico è salvato dal punto di vista della Victoria ('vch', 'draw',
 * 'opp'); a video diventa 1/X/2 con la squadra di casa a sinistra.
 * Tutte le scritture passano dalle RPC chiamate dal browser, che leggono l'IP
 * del tifoso per il limite di 3 pronostici per rete.
 */
export type Pick = "vch" | "draw" | "opp";

export interface PickOption {
  pick: Pick;
  /** 1, X o 2 */
  sign: string;
  /** Squadra che vince, o "Pareggio" */
  label: string;
}

/** Opzioni in ordine 1, X, 2 rispetto a chi gioca in casa. */
export function pickOptions(isHome: boolean, opponent: string): PickOption[] {
  const vch = { pick: "vch" as const, label: "Victoria" };
  const opp = { pick: "opp" as const, label: opponent };
  const [home, away] = isHome ? [vch, opp] : [opp, vch];
  return [
    { ...home, sign: "1" },
    { pick: "draw", sign: "X", label: "Pareggio" },
    { ...away, sign: "2" },
  ];
}

export const predictErrors: Record<string, string> = {
  bad_device: "Il browser blocca la memoria locale: attivala per partecipare.",
  bad_nickname: "Il nickname deve avere da 3 a 20 caratteri tra lettere, numeri, spazi, punti e trattini.",
  nickname_taken: "Questo nickname è già usato da un altro tifoso.",
  no_nickname: "Scegli prima un nickname.",
  bad_pick: "Pronostico non valido.",
  not_found: "Partita non trovata.",
  closed: "I pronostici per questa partita sono chiusi.",
  ip_limit: "Dalla tua rete sono già stati fatti 3 pronostici per questa partita.",
};

/** Stesso id del dispositivo usato per il voto MVP e le statistiche PWA. */
export function deviceId() {
  try {
    let id = localStorage.getItem("vch-device-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("vch-device-id", id);
    }
    return id;
  } catch {
    return null;
  }
}
