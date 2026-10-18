-- Esito delle partite a eliminazione diretta: oltre ai rigori (già presenti)
-- si segna se il risultato è maturato dopo i tempi supplementari.
-- I gol salvati includono quelli dei supplementari; i rigori restano a parte
-- e si possono avere anche senza supplementari (es. Coppa Italia Over 35).
alter table public.matches
  add column if not exists extra_time boolean not null default false;

alter table public.competition_results
  add column if not exists extra_time boolean not null default false;
