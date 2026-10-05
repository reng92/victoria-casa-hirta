-- Calendario generato in automatico e tabellone della fase finale.
--
-- competitions.legs: 1 = solo andata, 2 = andata e ritorno (gironi / girone unico).
-- competitions.qualified_per_group: squadre che passano da ogni girone alla fase finale.
--
-- Fase a eliminazione diretta: ogni partita ha `round` (es. "Semifinale") e
-- `bracket_slot` (1, 2, ... nell'ordine del tabellone). `home_source` /
-- `away_source` dicono da dove arriva la squadra finché non è nota:
--   'G:A:1'           = 1ª classificata del girone A
--   'W:Semifinale:1'  = vincente della Semifinale 1
-- e restano anche dopo, così se un risultato viene corretto il tabellone si
-- riallinea. Sono SEMPRE nell'orientamento reale casa/trasferta, anche in
-- `matches` (dove invece punteggi e rigori seguono la convenzione Victoria:
-- home_* = Victoria).

alter table public.competitions
  add column if not exists legs smallint not null default 1 check (legs in (1, 2)),
  add column if not exists qualified_per_group smallint not null default 2 check (qualified_per_group between 1 and 8);

alter table public.competition_results
  add column if not exists bracket_slot smallint,
  add column if not exists home_penalties integer check (home_penalties >= 0),
  add column if not exists away_penalties integer check (away_penalties >= 0),
  add column if not exists home_source text,
  add column if not exists away_source text;

alter table public.matches
  add column if not exists round text,
  add column if not exists bracket_slot smallint,
  add column if not exists home_penalties integer check (home_penalties >= 0),
  add column if not exists away_penalties integer check (away_penalties >= 0),
  add column if not exists home_source text,
  add column if not exists away_source text;
