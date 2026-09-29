// Moduli di gioco e posizioni in campo della formazione (match_formations).
// Coordinate in percentuale: x da sinistra, y dall'alto; la Victoria attacca
// verso l'alto, quindi il portiere sta in basso.

export const MODULES = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "4-3-1-2", "5-3-2", "4-5-1"] as const;

export type Slot = { x: number; y: number };

const GK: Slot = { x: 50, y: 90 };
const FIRST_ROW_Y = 72; // difesa
const LAST_ROW_Y = 20; // attacco
const X_GAP: Record<number, number> = { 1: 0, 2: 30, 3: 27, 4: 22, 5: 18 };

/** Posizioni del modulo: portiere per primo, poi dalla difesa all'attacco, da sinistra a destra. */
export function moduleSlots(module: string): Slot[] {
  const rows = module.split("-").map(Number).filter(n => n > 0);
  const step = rows.length > 1 ? (FIRST_ROW_Y - LAST_ROW_Y) / (rows.length - 1) : 0;
  const slots: Slot[] = [GK];
  rows.forEach((count, r) => {
    const y = Math.round(FIRST_ROW_Y - r * step);
    const gap = X_GAP[count] ?? 90 / count;
    for (let i = 0; i < count; i++) {
      slots.push({ x: Math.round(50 + (i - (count - 1) / 2) * gap), y });
    }
  });
  return slots;
}

/** Ricava il modulo dalle posizioni salvate: righe per altezza, portiere escluso. */
export function inferModule(positions: Slot[]): string | null {
  if (positions.length < 2) return null;
  const sorted = [...positions].sort((a, b) => b.y - a.y);
  const outfield = sorted.slice(1);
  const rows: number[][] = [];
  for (const p of outfield) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[last.length - 1] - p.y) <= 6) last.push(p.y);
    else rows.push([p.y]);
  }
  return rows.map(r => r.length).join("-");
}

/** Nome di battesimo ("Mario De Luca" → "Mario"); vuoto se c'è una sola parola. */
export function firstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[0] : "";
}

/** Cognome per le etichette in campo ("Mario De Luca" → "De Luca"). */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
}
