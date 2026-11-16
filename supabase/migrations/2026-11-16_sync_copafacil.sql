-- Sincronizzazione automatica da Copafacil (risultati, calendario, classifica,
-- marcatori) per le competizioni con `source_event` impostato.
-- Gira dentro Postgres (estensione http + pg_cron): nessun costo su Vercel.

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

-- ── Configurazione sorgente ────────────────────────────────────────────────
alter table public.competitions
  add column if not exists source_event text,  -- es. '-8zbvs' o '-ngzo-w9miu80vmmhi68@1pw8'
  add column if not exists source_phase text;  -- id della fase (campo `fs` delle partite)

alter table public.matches add column if not exists source_id text;
alter table public.competition_results add column if not exists source_id text;
create unique index if not exists matches_source_id_key
  on public.matches (competition_id, source_id) where source_id is not null;
create unique index if not exists competition_results_source_id_key
  on public.competition_results (competition_id, source_id) where source_id is not null;

-- ── Nomi squadra ───────────────────────────────────────────────────────────
create or replace function public.team_norm(t text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(
    translate(lower(coalesce(t, '')), 'àáâäèéêëìíîïòóôöùúûüç', 'aaaaeeeeiiiioooouuuuc'),
    '[^a-z0-9]', '', 'g')
$$;

-- Nome della fonte (normalizzato con team_norm) → nome usato sul sito.
create table if not exists public.team_aliases (
  alias text primary key,
  team_name text not null
);
alter table public.team_aliases enable row level security;
drop policy if exists "public read team_aliases" on public.team_aliases;
create policy "public read team_aliases" on public.team_aliases for select using (true);
drop policy if exists "admin write team_aliases" on public.team_aliases;
create policy "admin write team_aliases" on public.team_aliases for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.resolve_team(p_comp uuid, p_name text) returns text
language sql stable set search_path = '' as $$
  select coalesce(
    (select a.team_name from public.team_aliases a where a.alias = public.team_norm(p_name)),
    case when public.team_norm(p_name) like '%victoriacasahirta%' then 'Victoria Casa Hirta' end,
    (select s.team_name from public.standings s
       where s.competition_id = p_comp and public.team_norm(s.team_name) = public.team_norm(p_name) limit 1),
    (select l.team_name from public.team_logos l
       where public.team_norm(l.team_name) = public.team_norm(p_name) limit 1),
    initcap(trim(p_name))
  )
$$;

-- ── Marcatori per competizione (tutte le squadre) ──────────────────────────
create table if not exists public.competition_scorers (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  source_id text not null,
  player_name text not null,
  team_name text not null,
  goals integer not null,
  updated_at timestamptz not null default now(),
  primary key (competition_id, source_id)
);
alter table public.competition_scorers enable row level security;
drop policy if exists "public read competition_scorers" on public.competition_scorers;
create policy "public read competition_scorers" on public.competition_scorers for select using (true);
drop policy if exists "admin write competition_scorers" on public.competition_scorers;
create policy "admin write competition_scorers" on public.competition_scorers for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Lettura dalla CDN pubblica di Copafacil ────────────────────────────────
create schema if not exists private;

create or replace function private.copafacil_get(p_path text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  r extensions.http_response;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '30');
  select * into r from extensions.http_get(
    'https://firebase-database.b-cdn.net/events/' || p_path || '.json?m=' || floor(extract(epoch from now()) / 600)::bigint);
  if r.status <> 200 then
    raise exception 'Copafacil % ha risposto %', p_path, r.status;
  end if;
  return coalesce(r.content::jsonb, '{}'::jsonb);
end;
$$;

-- ── Sincronizzazione di una competizione ───────────────────────────────────
create or replace function private.sync_copafacil_competition(p_comp uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare
  c public.competitions%rowtype;
  vch constant text := 'Victoria Casa Hirta';
  teams jsonb; ms jsonb; players jsonb;
  tmap jsonb := '{}';
  phase_teams text[] := '{}';
  sets text[];
  tid text; tv jsonb; nm text; stats jsonb;
  k text; v jsonb; h text; a text; opp text; vch_home boolean;
  md int; d timestamptz; fin boolean; hs int; aws int; st text;
  mid uuid; mstatus text; mslug text; rid uuid;
  n_teams int := 0; n_matches int := 0; n_results int := 0; n_scorers int := 0;
begin
  select * into c from public.competitions where id = p_comp;
  if c.source_event is null or c.source_phase is null then
    return jsonb_build_object('competition', c.name, 'skipped', true);
  end if;

  -- Squadre della fase e classifica ufficiale (campo dt: 1=G 2=V 3=N 4=P 0=Pt 5=GF 6=GS)
  teams := private.copafacil_get(c.source_event || '/teams');
  for tid, tv in select key, value from jsonb_each(teams) loop
    continue when tv->>'name' is null or upper(trim(tv->>'name')) = 'RIPOSO';
    nm := public.resolve_team(c.id, tv->>'name');
    tmap := tmap || jsonb_build_object(tid, nm);
    continue when not coalesce(tv->'dt' ? c.source_phase, false);

    phase_teams := phase_teams || nm;
    n_teams := n_teams + 1;
    select coalesce(jsonb_object_agg(split_part(x, '=', 1), split_part(x, '=', 2)), '{}')
      into stats
      from unnest(string_to_array(trim(both '#' from coalesce(tv->'dt'->c.source_phase->>'dt', '')), '#')) x
      where x like '%=%';

    update public.standings set
      team_name = nm, group_name = null,
      played = coalesce((stats->>'1')::numeric, 0), won = coalesce((stats->>'2')::numeric, 0),
      drawn = coalesce((stats->>'3')::numeric, 0), lost = coalesce((stats->>'4')::numeric, 0),
      points = coalesce((stats->>'0')::numeric, 0),
      goals_for = coalesce((stats->>'5')::numeric, 0), goals_against = coalesce((stats->>'6')::numeric, 0),
      updated_at = now()
    where competition_id = c.id and public.team_norm(team_name) = public.team_norm(nm);
    if not found then
      insert into public.standings (competition_id, team_name, played, won, drawn, lost, points, goals_for, goals_against)
      values (c.id, nm, coalesce((stats->>'1')::numeric, 0), coalesce((stats->>'2')::numeric, 0),
        coalesce((stats->>'3')::numeric, 0), coalesce((stats->>'4')::numeric, 0), coalesce((stats->>'0')::numeric, 0),
        coalesce((stats->>'5')::numeric, 0), coalesce((stats->>'6')::numeric, 0));
    end if;

    -- Logo dalla fonte solo se la squadra non ne ha già uno
    if tv->>'url' is not null and not exists (
      select 1 from public.team_logos l where public.team_norm(l.team_name) = public.team_norm(nm)
    ) then
      insert into public.team_logos (team_name, logo_url) values (nm, tv->>'url') on conflict do nothing;
    end if;
  end loop;

  if n_teams > 0 then
    delete from public.standings s
    where s.competition_id = c.id
      and public.team_norm(s.team_name) <> all (select public.team_norm(x) from unnest(phase_teams) x);
  end if;

  -- Partite della fase (stanno sotto l'evento padre, filtrate per sotto-evento e fase)
  ms := private.copafacil_get(split_part(c.source_event, '@', 1) || '/matchs');
  create temp table if not exists _cf_matches (mk text, mv jsonb) on commit drop;
  truncate _cf_matches;
  insert into _cf_matches
    select key, value from jsonb_each(ms)
    where value->>'fs' = c.source_phase
      and (position('@' in c.source_event) = 0 or value->>'evt' = c.source_event);
  select array_agg(s order by s) into sets
    from (select distinct x.mv->>'m_set' s from _cf_matches x where x.mv->>'m_set' is not null) y;

  for k, v in select x.mk, x.mv from _cf_matches x loop
    h := tmap->>(v->>'team1');
    a := tmap->>(v->>'team2');
    continue when h is null or a is null;

    md := array_position(sets, v->>'m_set');
    d := case when v ? 'd_i'
      then to_timestamp(((v->>'d_i')::bigint - coalesce((v->>'gmt')::bigint, 0)) / 1000.0) end;
    fin := v->>'st' = '3';
    hs := case when fin then coalesce((v->'dt'->>'qt_g1')::int, 0) end;
    aws := case when fin then coalesce((v->'dt'->>'qt_g2')::int, 0) end;
    st := case when fin then 'finished' else 'scheduled' end;

    if h = vch or a = vch then
      -- Partita del Victoria: in `matches` (avversario in away_team, home_score = gol VCH)
      vch_home := h = vch;
      opp := case when vch_home then a else h end;
      mid := null;
      select m.id, m.status, m.slug into mid, mstatus, mslug from public.matches m
      where m.competition_id = c.id
        and (m.source_id = k or (m.source_id is null
          and public.resolve_team(c.id, m.away_team) = opp
          and (m.matchday = md or (d is not null and (m.match_date at time zone 'UTC')::date = (d at time zone 'UTC')::date))))
      order by (m.source_id = k) desc nulls last
      limit 1;

      if mid is not null then
        update public.matches m set
          source_id = k, matchday = md, away_team = opp, is_home = vch_home,
          match_date = coalesce(d, m.match_date),
          home_score = case when fin and m.status <> 'live' then case when vch_home then hs else aws end else m.home_score end,
          away_score = case when fin and m.status <> 'live' then case when vch_home then aws else hs end else m.away_score end,
          status = case when fin and m.status <> 'live' then 'finished' else m.status end
        where m.id = mid
          and (m.source_id is distinct from k or m.matchday is distinct from md or m.away_team <> opp
            or m.is_home <> vch_home or (d is not null and m.match_date <> d)
            or (fin and m.status <> 'live' and (m.status <> 'finished'
              or m.home_score is distinct from case when vch_home then hs else aws end
              or m.away_score is distinct from case when vch_home then aws else hs end)));
        -- I link condivisi restano validi anche se cambiano data o nome avversario
        update public.matches set slug = mslug where id = mid and slug <> mslug;
        delete from public.competition_results where competition_id = c.id and source_id = k;
        n_matches := n_matches + 1;
        continue;
      elsif d is not null then
        insert into public.matches (competition_id, away_team, is_home, match_date, matchday,
          home_score, away_score, status, source_id, opponent_logo_url)
        values (c.id, opp, vch_home, d, md,
          case when vch_home then hs else aws end, case when vch_home then aws else hs end, st, k,
          (select l.logo_url from public.team_logos l where public.team_norm(l.team_name) = public.team_norm(opp) limit 1));
        delete from public.competition_results where competition_id = c.id and source_id = k;
        n_matches := n_matches + 1;
        continue;
      end if;
      -- senza data: resta in competition_results come le altre partite
    end if;

    rid := null;
    select r.id into rid from public.competition_results r
    where r.competition_id = c.id
      and (r.source_id = k or (r.source_id is null and r.round is null
        and public.resolve_team(c.id, r.home_team) = h and public.resolve_team(c.id, r.away_team) = a))
    order by (r.source_id = k) desc nulls last
    limit 1;

    if rid is not null then
      update public.competition_results r set
        source_id = k, matchday = md, home_team = h, away_team = a, group_name = null,
        match_date = coalesce(d, r.match_date),
        home_score = case when fin then hs else r.home_score end,
        away_score = case when fin then aws else r.away_score end,
        status = case when fin then 'finished' else r.status end
      where r.id = rid;
    else
      insert into public.competition_results (competition_id, source_id, matchday, home_team, away_team,
        match_date, home_score, away_score, status)
      values (c.id, k, md, h, a, d, hs, aws, st);
    end if;
    n_results := n_results + 1;
  end loop;

  -- Marcatori della fase (campo ART = reti)
  players := private.copafacil_get(c.source_event || '/player');
  delete from public.competition_scorers where competition_id = c.id;
  insert into public.competition_scorers (competition_id, source_id, player_name, team_name, goals)
  select c.id, p.key, trim(p.value->>'name'), tmap->>(p.value->>'team'),
         coalesce((p.value->'fs'->c.source_phase->>'ART')::numeric, 0)::int
  from jsonb_each(players) p
  where tmap ? (p.value->>'team')
    and coalesce((p.value->'fs'->c.source_phase->>'ART')::numeric, 0) > 0
    and trim(coalesce(p.value->>'name', '')) <> '';
  get diagnostics n_scorers = row_count;

  return jsonb_build_object('competition', c.name, 'teams', n_teams, 'vch_matches', n_matches,
    'results', n_results, 'scorers', n_scorers);
end;
$$;

-- Tutte le competizioni attive collegate (o una sola). Chiamabile dal cron
-- (utente postgres) o da un admin via RPC.
create or replace function public.sync_copafacil(p_competition uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  res jsonb := '[]';
begin
  if session_user not in ('postgres', 'supabase_admin') and not public.is_admin() then
    raise exception 'Non autorizzato';
  end if;
  for cid in
    select id from public.competitions
    where source_event is not null
      and (p_competition is null and status = 'attiva' or id = p_competition)
  loop
    begin
      res := res || jsonb_build_array(private.sync_copafacil_competition(cid));
    exception when others then
      res := res || jsonb_build_array(jsonb_build_object('competition_id', cid, 'error', sqlerrm));
    end;
  end loop;
  return res;
end;
$$;

revoke all on function public.sync_copafacil(uuid) from public, anon;
grant execute on function public.sync_copafacil(uuid) to authenticated;
revoke all on schema private from public, anon, authenticated;

-- ── Dati: competizioni collegate, alias, squadra rinominata ────────────────
update public.competitions set source_event = '-8zbvs', source_phase = '1793039945011'
  where id = '14b521fc-688b-4500-95cd-f78e2a15485a'; -- Campionato over 35 - 2026/27
update public.competitions set source_event = '-ngzo-w9miu80vmmhi68@1pw8', source_phase = '1789112801331'
  where id = 'f6fbdca3-c542-48f0-9c0f-95ab6e9a74c1'; -- Coppa Italia Open

insert into public.team_aliases (alias, team_name) values
  ('ssfalegnameriacosenza', 'Falegnameria Cosenza'),
  ('spartacusmarcianise', 'S.S. Annunziata Marcianise'),
  ('luscianofc', 'Lusciano'),
  ('maddalonesefc', 'Maddalonese'),
  ('terradeivalori', 'ASD Terra dei Valori')
on conflict (alias) do update set team_name = excluded.team_name;

-- "Spartacus Marcianise" era un errore: la squadra è la S.S. Annunziata Marcianise
update public.standings set team_name = 'S.S. Annunziata Marcianise' where team_name = 'Spartacus Marcianise';
update public.competition_results set home_team = 'S.S. Annunziata Marcianise' where home_team = 'Spartacus Marcianise';
update public.competition_results set away_team = 'S.S. Annunziata Marcianise' where away_team = 'Spartacus Marcianise';
do $$
declare r record;
begin
  for r in select id, slug from public.matches where away_team = 'Spartacus Marcianise' loop
    update public.matches set away_team = 'S.S. Annunziata Marcianise',
      opponent_logo_url = '/loghi/ss-annunziata-marcianise.webp' where id = r.id;
    update public.matches set slug = r.slug where id = r.id;
  end loop;
end $$;

insert into public.team_logos (team_name, logo_url) values
  ('S.S. Annunziata Marcianise', '/loghi/ss-annunziata-marcianise.webp'),
  ('Atletico Aversa', '/loghi/atletico-aversa.webp'),
  ('Gioventu Normanna', '/loghi/gioventu-normanna.webp'),
  ('Hermès Napoli', '/loghi/hermes-napoli.webp'),
  ('Lusciano', '/loghi/lusciano.webp'),
  ('Maddalonese', '/loghi/maddalonese.webp')
on conflict (team_name) do update set logo_url = excluded.logo_url;

-- ── Pianificazione: ogni 2 ore (le partite finiscono tra pomeriggio e sera) ─
select cron.unschedule(jobid) from cron.job where jobname = 'sync-copafacil';
select cron.schedule('sync-copafacil', '5 */2 * * *', $$select public.sync_copafacil()$$);
