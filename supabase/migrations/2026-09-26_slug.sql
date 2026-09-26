-- Slug leggibili per gli URL di partite e giocatori.
--   partita:   /calendario/victoria-casa-hirta-vs-real-mandrill-2026-04-27
--   giocatore: /rosa/mario-rossi
-- Generati dal database a ogni inserimento/modifica, così valgono anche per
-- quello che si inserisce dall'admin. I vecchi URL con l'UUID reindirizzano.

create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(
      coalesce(value, ''),
      'àáâãäåèéêëìíîïòóôõöùúûüñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÇ''’',
      'aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc  '
    )),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Rende unico lo slug nella tabella aggiungendo -2, -3, ... se serve
create or replace function public.unique_slug(tbl regclass, base text, self_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  candidate text := base;
  n int := 1;
  taken boolean;
begin
  loop
    execute format('select exists (select 1 from %s where slug = $1 and id is distinct from $2)', tbl)
      into taken using candidate, self_id;
    exit when not taken;
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;

/* ---------- Partite ---------- */
alter table public.matches add column if not exists slug text;

create or replace function public.matches_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  vch text := coalesce(nullif(new.home_team, ''), 'Victoria Casa Hirta');
  home text := case when new.is_home then vch else new.away_team end;
  away text := case when new.is_home then new.away_team else vch end;
begin
  new.slug := public.unique_slug(
    'public.matches',
    public.slugify(home || ' vs ' || away || ' ' || to_char(new.match_date at time zone 'UTC', 'YYYY-MM-DD')),
    new.id
  );
  return new;
end;
$$;

drop trigger if exists matches_set_slug on public.matches;
create trigger matches_set_slug
  before insert or update of home_team, away_team, is_home, match_date on public.matches
  for each row execute function public.matches_set_slug();

update public.matches set away_team = away_team;
alter table public.matches alter column slug set not null;
create unique index if not exists matches_slug_key on public.matches (slug);

/* ---------- Giocatori ---------- */
alter table public.players add column if not exists slug text;

create or replace function public.players_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.slug := public.unique_slug('public.players', public.slugify(new.full_name), new.id);
  return new;
end;
$$;

drop trigger if exists players_set_slug on public.players;
create trigger players_set_slug
  before insert or update of full_name on public.players
  for each row execute function public.players_set_slug();

update public.players set full_name = full_name;
alter table public.players alter column slug set not null;
create unique index if not exists players_slug_key on public.players (slug);
