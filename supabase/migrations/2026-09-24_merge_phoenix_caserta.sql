-- Unifica "Phoenix Caserta 2016" e "Phoenix Caserta" (stessa squadra):
-- nome unico "Phoenix Caserta" su partite e classifiche, logo riusato
-- dalle partite che già lo avevano. Rieseguibile.

with logo as (
  select opponent_logo_url as url from public.matches
  where away_team in ('Phoenix Caserta 2016', 'Phoenix Caserta') and opponent_logo_url is not null
  order by match_date desc limit 1
)
update public.matches m
set away_team = 'Phoenix Caserta',
    opponent_logo_url = coalesce(m.opponent_logo_url, (select url from logo))
where m.away_team in ('Phoenix Caserta 2016', 'Phoenix Caserta');

update public.standings set team_name = 'Phoenix Caserta' where team_name = 'Phoenix Caserta 2016';
