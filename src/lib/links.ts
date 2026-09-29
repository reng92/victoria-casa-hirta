// URL pubblici di partite, giocatori e news: si usa lo slug leggibile generato dal
// database; l'id resta come ripiego (le pagine reindirizzano allo slug).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID_RE.test(value);

export const matchHref = (m: { id: string; slug?: string | null }) => `/calendario/${m.slug || m.id}`;

export const playerHref = (p: { id: string; slug?: string | null }) => `/rosa/${p.slug || p.id}`;

export const newsHref = (n: { id: string; slug?: string | null }) => `/news/${n.slug || n.id}`;
