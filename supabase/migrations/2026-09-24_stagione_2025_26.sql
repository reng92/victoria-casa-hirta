-- ============================================================================
-- Stagione 2025/2026: risultati e classifiche definitive
--   · Campania Felix - Over 35 - 2025/26 (Enjore)      → correzioni date/orari, 13ª giornata, classifica finale
--   · Campionato Open 25/26 (Copafacil)                → nuova competizione, 14 partite, classifica finale
--   · Champions League Open 25/26 (Copafacil)          → nuova competizione, girone (7) + Confederation Cup (3), classifica girone
-- Convenzioni del sito: away_team = avversario, is_home = casa/trasferta,
-- home_score = gol Victoria, away_score = gol avversario, orari scritti senza fuso.
-- Rieseguibile: INSERT protetti da WHERE NOT EXISTS, UPDATE idempotenti.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Campi (venues) mancanti
-- ----------------------------------------------------------------------------
insert into public.venues (name, address, city)
select v.name, v.address, v.city
from (values
  ('Centro Sportivo Vanvitelli', null, 'Caserta'),
  ('TDL Marcianise',             null, 'Marcianise'),
  ('Sporting Village Cesa',      null, 'Cesa'),
  ('Centro Sportivo Igloo',      null, 'Carinaro'),
  ('Comunale Trentola Ducenta',  null, 'Trentola Ducenta'),
  ('Campo Trotta Recale',        null, 'Recale'),
  ('Comunale Cancello Scalo',    null, 'Cancello Scalo'),
  ('Campo Casolla',              null, 'Caserta'),
  ('Campo Bisceglia Aversa',     null, 'Aversa')
) as v(name, address, city)
where not exists (select 1 from public.venues x where x.name = v.name);

-- Unifica il doppione "Centro sportivo Talamonti" (s minuscola) sul campo principale
update public.matches m
set venue_id = (select id from public.venues where name = 'Centro Sportivo Talamonti' limit 1)
where m.venue_id in (select id from public.venues where name = 'Centro sportivo Talamonti');
delete from public.venues where name = 'Centro sportivo Talamonti';

-- ----------------------------------------------------------------------------
-- 1. Campania Felix - Over 35 - 2025/26: stagione, formato, stato
-- ----------------------------------------------------------------------------
update public.competitions
set season_id = (select id from public.seasons where name = '2025/2026' limit 1),
    format = 'girone_unico',
    status = 'conclusa',
    organizer = coalesce(organizer, 'ASI Campania Felix')
where name = 'Campania Felix - Over 35 - 2025/26';

-- Correzioni partite (anno 2025→2026 dove sbagliato, orari, 13ª giornata giocata)
with c as (select id from public.competitions where name = 'Campania Felix - Over 35 - 2025/26'),
fix(matchday, match_date, home_score, away_score, is_home) as (values
  (1,  '2025-12-13T16:00:00', 7,  4, false),
  (2,  '2025-12-20T14:30:00', 2,  1, true),
  (3,  '2026-01-10T14:30:00', 0,  1, true),
  (4,  '2026-02-21T14:30:00', 0,  1, false),
  (5,  '2026-01-24T14:30:00', 2,  1, true),
  (6,  '2026-01-31T14:30:00', 4,  3, false),
  (7,  '2026-02-07T14:30:00', 4,  1, false),
  (8,  '2026-02-28T16:00:00', 13, 0, true),
  (9,  '2026-03-05T21:00:00', 2,  0, false),
  (10, '2026-03-14T14:30:00', 0,  0, false),
  (11, '2026-03-21T14:30:00', 4,  2, true),
  (12, '2026-03-28T14:30:00', 6,  3, false),
  (13, '2026-04-27T21:15:00', 2,  1, true),
  (14, '2026-04-13T21:00:00', 6,  5, true)
)
update public.matches m
set match_date = fix.match_date::timestamptz,
    home_score = fix.home_score,
    away_score = fix.away_score,
    is_home    = fix.is_home,
    status     = 'finished'
from fix, c
where m.competition_id = c.id and m.matchday = fix.matchday;

-- Classifica finale (aggiorna le righe esistenti per nome squadra)
with c as (select id from public.competitions where name = 'Campania Felix - Over 35 - 2025/26'),
t(team_name, played, won, drawn, lost, gf, ga, points) as (values
  ('ASD Macerata Calcio 2018', 14, 11, 3, 0, 43, 15, 36),
  ('Victoria Casa Hirta',      14, 11, 1, 2, 52, 23, 34),
  ('Amatori Villa Volturno',   14,  9, 2, 3, 35, 21, 29),
  ('AFC Cerasole',             14,  8, 0, 6, 49, 30, 24),
  ('Old Lions 2022',           14,  5, 3, 6, 26, 29, 18),
  ('Real Mandrill',            13,  4, 0, 9, 34, 42, 12),
  ('SS Cosenza',               13,  1, 1, 11, 25, 75, 4),
  ('Phoenix Caserta 2016',     14,  0, 2, 12, 24, 53, 2)
)
update public.standings s
set played = t.played, won = t.won, drawn = t.drawn, lost = t.lost,
    goals_for = t.gf, goals_against = t.ga, points = t.points, updated_at = now()
from t, c
where s.competition_id = c.id and s.team_name = t.team_name;

-- ----------------------------------------------------------------------------
-- 2. Campionato Open 25/26 (Lega Amatori Calcio Campania ACSI)
-- ----------------------------------------------------------------------------
insert into public.competitions (name, type, organizer, season_id, status, format)
select 'Campionato Open 25/26', 'campionato', 'Lega Amatori Calcio Campania ACSI',
       (select id from public.seasons where name = '2025/2026' limit 1), 'conclusa', 'girone_unico'
where not exists (select 1 from public.competitions where name = 'Campionato Open 25/26');

insert into public.matches (competition_id, venue_id, matchday, match_date, away_team, is_home, home_score, away_score, status)
select c.id, v.id, r.matchday, r.match_date::timestamptz, r.opponent, r.is_home, r.vch, r.opp, 'finished'
from (values
  (1,  '2025-11-10T21:00:00', 'FC Aversa',          true,  2, 3, 'Campo Trotta Recale'),
  (2,  '2026-01-21T21:00:00', 'Lusciano FC',        false, 2, 0, 'Centro Sportivo Igloo'),
  (3,  '2025-11-26T21:00:00', 'Talamonti 14',       false, 2, 3, 'Centro Sportivo Vanvitelli'),
  (4,  '2025-12-02T21:00:00', 'Atletico Aversa',    true,  3, 3, 'Campo Comunale S. Commaia'),
  (5,  '2026-01-13T21:00:00', 'Gioventù Normanna',  true,  2, 2, 'Campo Comunale S. Commaia'),
  (6,  '2025-12-17T21:00:00', 'Boys Vanvitelli',    true,  3, 2, 'Campo Trotta Recale'),
  (7,  '2026-01-09T21:30:00', 'Hermes Napoli',      false, 5, 2, 'TDL Marcianise'),
  (8,  '2026-01-26T21:00:00', 'FC Aversa',          false, 1, 1, 'Sporting Village Cesa'),
  (9,  '2026-02-03T21:00:00', 'Lusciano FC',        true,  4, 2, 'Campo Comunale S. Commaia'),
  (10, '2026-02-11T21:00:00', 'Talamonti 14',       true,  1, 5, 'Campo Trotta Recale'),
  (11, '2026-02-18T21:00:00', 'Atletico Aversa',    false, 2, 1, 'Centro Sportivo Igloo'),
  (12, '2026-02-25T21:00:00', 'Gioventù Normanna',  false, 2, 5, 'Sporting Village Cesa'),
  (13, '2026-03-02T21:00:00', 'Boys Vanvitelli',    false, 6, 3, 'Centro Sportivo Vanvitelli'),
  (14, '2026-03-13T21:30:00', 'Hermes Napoli',      true,  3, 3, 'TDL Marcianise')
) as r(matchday, match_date, opponent, is_home, vch, opp, venue)
join public.competitions c on c.name = 'Campionato Open 25/26'
left join public.venues v on v.name = r.venue
where not exists (select 1 from public.matches m where m.competition_id = c.id and m.matchday = r.matchday);

insert into public.standings (competition_id, team_name, played, won, drawn, lost, goals_for, goals_against, points)
select c.id, t.team_name, t.played, t.won, t.drawn, t.lost, t.gf, t.ga, t.points
from (values
  ('Talamonti 14',       14, 12, 1, 1,  54, 17, 37),
  ('Gioventù Normanna',  14, 10, 3, 1,  46, 20, 33),
  ('FC Aversa',          14,  9, 2, 3,  33, 20, 29),
  ('Victoria Casa Hirta',14,  6, 4, 4,  38, 35, 22),
  ('Boys Vanvitelli',    14,  5, 1, 8,  30, 43, 16),
  ('Hermes Napoli',      14,  3, 3, 8,  29, 46, 12),
  ('Atletico Aversa',    14,  2, 2, 10, 19, 34, 8),
  ('Lusciano FC',        14,  0, 2, 12, 12, 46, 2)
) as t(team_name, played, won, drawn, lost, gf, ga, points)
join public.competitions c on c.name = 'Campionato Open 25/26'
where not exists (select 1 from public.standings s where s.competition_id = c.id and s.team_name = t.team_name);

-- ----------------------------------------------------------------------------
-- 3. Champions League Open 25/26 (post campionato): girone + Confederation Cup
-- ----------------------------------------------------------------------------
insert into public.competitions (name, type, organizer, season_id, status, format, notes)
select 'Champions League Open 25/26', 'coppa', 'Lega Amatori Calcio Campania ACSI',
       (select id from public.seasons where name = '2025/2026' limit 1), 'conclusa', 'gironi_poi_eliminazione_diretta',
       'Girone di qualificazione a 8 squadre, poi tabelloni Champions, Confederation ed Europa. La Victoria (5ª nel girone) ha giocato la Confederation Cup: quarti, semifinale andata e ritorno.'
where not exists (select 1 from public.competitions where name = 'Champions League Open 25/26');

-- Girone di qualificazione (matchday 1-7)
insert into public.matches (competition_id, venue_id, matchday, match_date, away_team, is_home, home_score, away_score, status)
select c.id, v.id, r.matchday, r.match_date::timestamptz, r.opponent, r.is_home, r.vch, r.opp, 'finished'
from (values
  (1, '2026-03-18T21:15:00', 'Talamonti 14',      false, 0, 3, 'Centro Sportivo Talamonti'),
  (2, '2026-03-24T21:00:00', 'Boys Vanvitelli',   true,  3, 2, 'Campo Comunale S. Commaia'),
  (3, '2026-03-30T21:00:00', 'Lusciano FC',       true,  4, 3, 'Campo Comunale S. Commaia'),
  (4, '2026-04-15T21:00:00', 'Gioventù Normanna', false, 0, 1, 'Centro Sportivo Igloo'),
  (5, '2026-04-22T21:00:00', 'FC Aversa',         false, 3, 0, 'Sporting Village Cesa'),
  (6, '2026-04-29T21:00:00', 'Atletico Aversa',   true,  4, 3, 'Campo Casolla'),
  (7, '2026-05-07T21:30:00', 'Hermes Napoli',     true,  0, 2, 'TDL Marcianise')
) as r(matchday, match_date, opponent, is_home, vch, opp, venue)
join public.competitions c on c.name = 'Champions League Open 25/26'
left join public.venues v on v.name = r.venue
where not exists (select 1 from public.matches m where m.competition_id = c.id and m.matchday = r.matchday);

-- Confederation Cup (fase a eliminazione diretta, matchday NULL, fase nelle note)
insert into public.matches (competition_id, venue_id, matchday, match_date, away_team, is_home, home_score, away_score, status, notes)
select c.id, v.id, null, r.match_date::timestamptz, r.opponent, r.is_home, r.vch, r.opp, 'finished', r.notes
from (values
  ('2026-05-15T21:00:00', 'Hermes Napoli', false, 3, 0, null,
     'Confederation Cup · Quarti di finale. Risultato registrato dall''organizzatore senza data (3-0).'),
  ('2026-05-22T21:00:00', 'Aversa FC',     true,  1, 3, 'Campo Comunale S. Commaia',
     'Confederation Cup · Semifinale di andata.'),
  ('2026-05-30T14:30:00', 'Aversa FC',     false, 1, 3, 'Campo Bisceglia Aversa',
     'Confederation Cup · Semifinale di ritorno.')
) as r(match_date, opponent, is_home, vch, opp, venue, notes)
join public.competitions c on c.name = 'Champions League Open 25/26'
left join public.venues v on v.name = r.venue
where not exists (
  select 1 from public.matches m
  where m.competition_id = c.id and m.matchday is null
    and m.away_team = r.opponent and m.match_date::date = r.match_date::date
);

-- Classifica del girone di qualificazione
insert into public.standings (competition_id, team_name, played, won, drawn, lost, goals_for, goals_against, points)
select c.id, t.team_name, t.played, t.won, t.drawn, t.lost, t.gf, t.ga, t.points
from (values
  ('Gioventù Normanna',   7, 5, 1, 1, 27, 13, 16),
  ('Talamonti 14',        7, 4, 2, 1, 27, 21, 14),
  ('Boys Vanvitelli',     7, 4, 1, 2, 22, 15, 13),
  ('Hermes Napoli',       7, 4, 1, 2, 20, 16, 13),
  ('Victoria Casa Hirta', 7, 4, 0, 3, 14, 14, 12),
  ('Lusciano FC',         7, 3, 0, 4, 24, 22, 9),
  ('Atletico Aversa',     7, 1, 1, 5, 14, 26, 4),
  ('FC Aversa',           7, 0, 0, 7, 0,  21, 0)
) as t(team_name, played, won, drawn, lost, gf, ga, points)
join public.competitions c on c.name = 'Champions League Open 25/26'
where not exists (select 1 from public.standings s where s.competition_id = c.id and s.team_name = t.team_name);
