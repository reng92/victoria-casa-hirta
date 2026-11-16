-- MVP del mese: l'admin decide se la card della votazione compare in home.
-- Di default sì, così ogni nuova votazione si vede subito; la si spegne
-- da /adminwebapp/mvp quando non serve più.
alter table public.mvp_polls
  add column if not exists show_in_home boolean not null default true;
