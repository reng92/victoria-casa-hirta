-- Foto di copertina di una partita, scelta dall'admin: è quella mostrata in
-- home nella card "Ultimo risultato" e per prima nella pagina della partita.
alter table public.gallery add column if not exists is_cover boolean not null default false;

-- Al massimo una copertina per partita
create unique index if not exists gallery_one_cover_per_match
  on public.gallery (match_id) where is_cover;

create index if not exists gallery_match_id_idx on public.gallery (match_id);
