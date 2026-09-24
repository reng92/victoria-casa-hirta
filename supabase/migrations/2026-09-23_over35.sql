-- ============================================================================
-- Stagione 2026/27 · Coppa Over 35 (gironi) · Centro Sportivo Talamonti
-- ----------------------------------------------------------------------------
-- Rieseguibile: ogni ALTER usa IF NOT EXISTS e ogni INSERT è protetto da
-- WHERE NOT EXISTS. Da lanciare nel SQL Editor di Supabase.
--
-- Schema di riferimento (ricavato dalle query dell'app, nessun file SQL nel repo):
--   seasons      (id, name, start_date, end_date, is_current)
--   competitions (id, name, type, level, organizer, logo_url, season_id)
--   venues       (id, name, address, city, maps_url, photo_url)
--   matches      (id, match_date, home_team, away_team, is_home, home_score,
--                 away_score, status, matchday, notes, opponent_logo_url,
--                 instagram_reels, live_*, venue_id, competition_id)
--   standings    (id, team_name, competition_id, played, won, drawn, lost,
--                 goals_for, goals_against, points)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colonne per gironi, formato e stato competizione
-- ----------------------------------------------------------------------------
alter table public.standings    add column if not exists group_name text;
alter table public.matches      add column if not exists group_name text;
alter table public.competitions add column if not exists format text;
alter table public.competitions add column if not exists status text default 'attiva';
-- La "formula" della coppa non aveva una colonna: la aggiungiamo.
alter table public.competitions add column if not exists notes text;

comment on column public.standings.group_name    is 'Girone (es. A, B). NULL per girone unico.';
comment on column public.matches.group_name      is 'Girone della partita (es. A, B). NULL se non applicabile.';
comment on column public.competitions.format     is 'girone_unico | gironi_poi_eliminazione_diretta | eliminazione_diretta';
comment on column public.competitions.status     is 'in_arrivo | attiva | conclusa';
comment on column public.competitions.notes      is 'Formula / note pubbliche della competizione.';

-- ----------------------------------------------------------------------------
-- 2. Stagione 2026/27 (attiva) — chiude la precedente
-- ----------------------------------------------------------------------------
insert into public.seasons (name, start_date, end_date, is_current)
select '2026/27', '2026-09-01', '2027-06-30', false
where not exists (select 1 from public.seasons where name = '2026/27');

update public.seasons set is_current = false where is_current = true and name <> '2026/27';
update public.seasons set is_current = true  where name = '2026/27';

-- Le competizioni delle stagioni passate (o senza stagione) risultano concluse.
update public.competitions
set status = 'conclusa'
where status = 'attiva'
  and (season_id is null or season_id in (select id from public.seasons where is_current = false));

-- ----------------------------------------------------------------------------
-- 3. Campionato 2026/27 (in arrivo, girone unico)
-- ----------------------------------------------------------------------------
insert into public.competitions (name, type, season_id, status, format)
select 'Campionato 2026/27', 'campionato', s.id, 'in_arrivo', 'girone_unico'
from public.seasons s
where s.name = '2026/27'
  and not exists (select 1 from public.competitions where name = 'Campionato 2026/27');

update public.competitions
set status = 'in_arrivo', format = 'girone_unico'
where name = 'Campionato 2026/27' and (status is distinct from 'in_arrivo' or format is distinct from 'girone_unico');

-- ----------------------------------------------------------------------------
-- 4. Coppa Over 35 (attiva, gironi + eliminazione diretta)
-- ----------------------------------------------------------------------------
insert into public.competitions (name, type, season_id, status, format, notes)
select 'Coppa Over 35', 'coppa', s.id, 'attiva', 'gironi_poi_eliminazione_diretta',
       'Passano le prime 2 di ogni girone, poi fase a eliminazione diretta'
from public.seasons s
where s.name = '2026/27'
  and not exists (select 1 from public.competitions where name = 'Coppa Over 35');

update public.competitions
set status = 'attiva',
    format = 'gironi_poi_eliminazione_diretta',
    notes  = 'Passano le prime 2 di ogni girone, poi fase a eliminazione diretta'
where name = 'Coppa Over 35'
  and (status is distinct from 'attiva'
    or format is distinct from 'gironi_poi_eliminazione_diretta'
    or notes  is distinct from 'Passano le prime 2 di ogni girone, poi fase a eliminazione diretta');

-- ----------------------------------------------------------------------------
-- 5. Campo: Centro Sportivo Talamonti (indirizzo da completare in /admin/campi)
-- ----------------------------------------------------------------------------
insert into public.venues (name, address, city, maps_url)
select 'Centro Sportivo Talamonti', null, null, null
where not exists (select 1 from public.venues where name = 'Centro Sportivo Talamonti');

-- ----------------------------------------------------------------------------
-- 6. Classifiche a zero per la Coppa Over 35 (team_name è testo, nessuna FK)
-- ----------------------------------------------------------------------------
insert into public.standings
  (competition_id, team_name, group_name, played, won, drawn, lost, goals_for, goals_against, points)
select c.id, t.team_name, t.group_name, 0, 0, 0, 0, 0, 0, 0
from public.competitions c
cross join (values
  ('Falegnameria Cosenza', 'A'),
  ('Phoenix Caserta',      'A'),
  ('Victoria Casa Hirta',  'A'),
  ('Cerasole',             'B'),
  ('Caserta Brewers',      'B'),
  ('FC Marcianise',        'B'),
  ('Real Mandrill',        'B')
) as t(team_name, group_name)
where c.name = 'Coppa Over 35'
  and not exists (
    select 1 from public.standings s
    where s.competition_id = c.id and s.team_name = t.team_name
  );

-- ----------------------------------------------------------------------------
-- 7. Prima partita: Phoenix Caserta – Victoria Casa Hirta, Girone A, 1ª giornata
--    26/09/2026 ore 14:30 (Europe/Rome).
--    Convenzione del form admin: away_team = avversario, is_home = false per la
--    trasferta, home_team non viene valorizzato (default lato DB); l'orario è
--    scritto senza fuso, come fa il pannello admin, così viene mostrato 14:30.
-- ----------------------------------------------------------------------------
insert into public.matches
  (away_team, is_home, match_date, competition_id, venue_id, group_name, matchday, status)
select 'Phoenix Caserta', false, '2026-09-26T14:30:00', c.id, v.id, 'A', 1, 'scheduled'
from public.competitions c
join public.venues v on v.name = 'Centro Sportivo Talamonti'
where c.name = 'Coppa Over 35'
  and not exists (
    select 1 from public.matches m
    where m.competition_id = c.id
      and m.away_team = 'Phoenix Caserta'
      and m.match_date::date = date '2026-09-26'
  );
