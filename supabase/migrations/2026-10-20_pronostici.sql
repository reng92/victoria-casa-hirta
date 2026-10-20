-- Pronostici dei tifosi: prima del calcio d'inizio il tifoso sceglie l'esito
-- della partita (vittoria Victoria, pareggio, vittoria avversario) e prende un
-- punto per ogni pronostico azzeccato. Niente account: il tifoso sceglie un
-- nickname legato al suo dispositivo (`vch-device-id` in localStorage, lo
-- stesso del voto MVP) e al massimo 3 pronostici per IP per partita
-- (famiglie o amici sulla stessa rete).
-- Tutto passa dalle RPC chiamate dal browser: l'IP si legge dalle intestazioni
-- che arrivano a Supabase, come in mvp_vote.

create table if not exists public.predictors (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (length(nickname) between 3 and 20),
  -- Id casuale del browser del tifoso: è la sua "password", mai pubblico
  device_id text not null unique check (length(device_id) between 8 and 64),
  created_at timestamptz not null default now()
);
create unique index if not exists predictors_nickname_key on public.predictors (lower(nickname));

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  predictor_id uuid not null references public.predictors(id) on delete cascade,
  -- Esito dal punto di vista della Victoria, indipendente da casa/trasferta
  pick text not null check (pick in ('vch', 'draw', 'opp')),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, predictor_id)
);
create index if not exists predictions_match_ip_idx on public.predictions (match_id, ip_hash);
create index if not exists predictions_predictor_idx on public.predictions (predictor_id);

alter table public.predictors enable row level security;
alter table public.predictions enable row level security;

-- Le righe le vede solo l'admin (contengono device id e hash IP); il pubblico
-- legge solo tramite le RPC qui sotto.
drop policy if exists "admin manage predictors" on public.predictors;
create policy "admin manage predictors" on public.predictors
  for all using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin manage predictions" on public.predictions;
create policy "admin manage predictions" on public.predictions
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- Calcio d'inizio come istante vero: match_date è salvato "naive" (14:30 è
-- scritto come 14:30 UTC ma è l'ora di Roma).
create or replace function public.match_kickoff(p_date timestamptz)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (p_date at time zone 'UTC') at time zone 'Europe/Rome';
$$;

-- Esito sul campo dal punto di vista della Victoria (home_score = Victoria,
-- sempre). I rigori non contano: una partita decisa ai rigori è un pareggio.
create or replace function public.match_pick_result(p_home integer, p_away integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_home is null or p_away is null then null
    when p_home > p_away then 'vch'
    when p_home < p_away then 'opp'
    else 'draw'
  end;
$$;

-- Sceglie o cambia il nickname del dispositivo. Restituisce 'ok' oppure il motivo del rifiuto.
create or replace function public.predict_set_nickname(p_device text, p_nickname text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nick text := regexp_replace(trim(coalesce(p_nickname, '')), '\s+', ' ', 'g');
begin
  if p_device is null or length(p_device) not between 8 and 64 then return 'bad_device'; end if;
  if length(v_nick) not between 3 and 20 or v_nick !~ '^[[:alnum:] ._-]+$' then return 'bad_nickname'; end if;
  insert into public.predictors (nickname, device_id) values (v_nick, p_device)
  on conflict (device_id) do update set nickname = excluded.nickname;
  return 'ok';
exception when unique_violation then
  return 'nickname_taken';
end;
$$;
revoke all on function public.predict_set_nickname(text, text) from public;
grant execute on function public.predict_set_nickname(text, text) to anon, authenticated;

-- Registra o cambia un pronostico fino al calcio d'inizio.
create or replace function public.predict(p_match uuid, p_pick text, p_device text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches%rowtype;
  v_predictor uuid;
  headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip_hash text := md5('vch-predict:' || coalesce(
    headers->>'cf-connecting-ip',
    trim(split_part(headers->>'x-forwarded-for', ',', 1)),
    'unknown'
  ));
begin
  if p_pick not in ('vch', 'draw', 'opp') then return 'bad_pick'; end if;
  select id into v_predictor from public.predictors where device_id = p_device;
  if not found then return 'no_nickname'; end if;
  select * into m from public.matches where id = p_match;
  if not found then return 'not_found'; end if;
  if m.status <> 'scheduled' or now() >= public.match_kickoff(m.match_date) then return 'closed'; end if;

  -- Il limite per IP vale solo per i nuovi pronostici, non per le modifiche
  if not exists (select 1 from public.predictions where match_id = p_match and predictor_id = v_predictor)
     and (select count(*) from public.predictions where match_id = p_match and ip_hash = v_ip_hash) >= 3 then
    return 'ip_limit';
  end if;

  insert into public.predictions (match_id, predictor_id, pick, ip_hash)
  values (p_match, v_predictor, p_pick, v_ip_hash)
  on conflict (match_id, predictor_id) do update set pick = excluded.pick, updated_at = now();
  return 'ok';
end;
$$;
revoke all on function public.predict(uuid, text, text) from public;
grant execute on function public.predict(uuid, text, text) to anon, authenticated;

-- Nickname e pronostico del dispositivo per una partita (anche senza partita: solo il nickname).
create or replace function public.predict_me(p_device text, p_match uuid default null)
returns table (nickname text, pick text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nickname, pr.pick
  from public.predictors p
  left join public.predictions pr on pr.predictor_id = p.id and pr.match_id = p_match
  where p.device_id = p_device;
$$;
revoke all on function public.predict_me(text, uuid) from public;
grant execute on function public.predict_me(text, uuid) to anon, authenticated;

-- Quanti tifosi hanno scelto ciascun esito.
create or replace function public.predict_stats(p_match uuid)
returns table (pick text, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select pick, count(*) from public.predictions where match_id = p_match group by pick;
$$;
revoke all on function public.predict_stats(uuid) from public;
grant execute on function public.predict_stats(uuid) to anon, authenticated;

-- Classifica dei tifosi sulla stagione in corso: 1 punto per pronostico azzeccato.
create or replace function public.predict_leaderboard(p_limit integer default 50)
returns table (nickname text, played bigint, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nickname,
         count(*) as played,
         count(*) filter (where pr.pick = public.match_pick_result(m.home_score, m.away_score)) as points
  from public.predictions pr
  join public.predictors p on p.id = pr.predictor_id
  join public.matches m on m.id = pr.match_id
  where m.status = 'finished'
    and m.match_date >= coalesce((select start_date from public.seasons where is_current limit 1), '-infinity'::date)
  group by p.id, p.nickname
  order by points desc, played asc, min(pr.created_at) asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
revoke all on function public.predict_leaderboard(integer) from public;
grant execute on function public.predict_leaderboard(integer) to anon, authenticated;
