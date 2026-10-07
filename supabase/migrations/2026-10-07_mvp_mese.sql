-- MVP del mese: l'admin crea una votazione per un mese, sceglie i candidati
-- dalla rosa e fissa apertura e chiusura. A differenza di matches.match_date,
-- opens_at e closes_at sono istanti VERI (l'admin li scrive in ora di Roma e
-- il client li converte in UTC), perché decidono se si può votare.
-- Il voto passa solo dalla RPC mvp_vote, che controlla la finestra con now()
-- del database: l'orologio del telefono del tifoso non conta.

create table if not exists public.mvp_polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- Primo giorno del mese a cui si riferisce il premio
  month date not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint mvp_polls_window check (closes_at > opens_at)
);

create table if not exists public.mvp_candidates (
  poll_id uuid not null references public.mvp_polls(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (poll_id, player_id)
);
create index if not exists mvp_candidates_player_idx on public.mvp_candidates (player_id);

create table if not exists public.mvp_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null,
  player_id uuid not null,
  -- Id casuale salvato nel browser e hash dell'IP calcolato da mvp_vote (mai l'IP in chiaro)
  device_id text not null check (length(device_id) between 8 and 64),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  foreign key (poll_id, player_id) references public.mvp_candidates(poll_id, player_id) on delete cascade,
  unique (poll_id, device_id)
);
create index if not exists mvp_votes_poll_ip_idx on public.mvp_votes (poll_id, ip_hash);

alter table public.mvp_polls enable row level security;
alter table public.mvp_candidates enable row level security;
alter table public.mvp_votes enable row level security;

drop policy if exists "public read mvp_polls" on public.mvp_polls;
create policy "public read mvp_polls" on public.mvp_polls for select using (true);
drop policy if exists "admin write mvp_polls" on public.mvp_polls;
create policy "admin write mvp_polls" on public.mvp_polls
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "public read mvp_candidates" on public.mvp_candidates;
create policy "public read mvp_candidates" on public.mvp_candidates for select using (true);
drop policy if exists "admin write mvp_candidates" on public.mvp_candidates;
create policy "admin write mvp_candidates" on public.mvp_candidates
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- I voti singoli li vede solo l'admin; il pubblico legge i totali da mvp_results
drop policy if exists "admin manage mvp_votes" on public.mvp_votes;
create policy "admin manage mvp_votes" on public.mvp_votes
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- Voti per candidato
create or replace function public.mvp_results(p_poll uuid)
returns table (player_id uuid, votes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.player_id, count(v.id)
  from public.mvp_candidates c
  left join public.mvp_votes v on v.poll_id = c.poll_id and v.player_id = c.player_id
  where c.poll_id = p_poll
  group by c.player_id;
$$;
revoke all on function public.mvp_results(uuid) from public;
grant execute on function public.mvp_results(uuid) to anon, authenticated;

-- Registra un voto. Restituisce 'ok' oppure il motivo del rifiuto.
-- Massimo 3 voti per IP per votazione (famiglie o amici sulla stessa rete).
-- L'IP si legge dalle intestazioni che arrivano a Supabase (cf-connecting-ip
-- lo imposta Cloudflare e il browser non può falsificarlo), quindi la RPC va
-- chiamata direttamente dal browser del tifoso, non da un server.
create or replace function public.mvp_vote(p_poll uuid, p_player uuid, p_device text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  poll public.mvp_polls%rowtype;
  headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip_hash text := md5('vch-mvp:' || coalesce(
    headers->>'cf-connecting-ip',
    trim(split_part(headers->>'x-forwarded-for', ',', 1)),
    'unknown'
  ));
begin
  if p_device is null or length(p_device) not between 8 and 64 then return 'bad_device'; end if;
  select * into poll from public.mvp_polls where id = p_poll;
  if not found then return 'not_found'; end if;
  if now() < poll.opens_at then return 'not_open'; end if;
  if now() >= poll.closes_at then return 'closed'; end if;
  if not exists (select 1 from public.mvp_candidates where poll_id = p_poll and player_id = p_player) then
    return 'not_candidate';
  end if;
  if exists (select 1 from public.mvp_votes where poll_id = p_poll and device_id = p_device) then
    return 'already_voted';
  end if;
  if (select count(*) from public.mvp_votes where poll_id = p_poll and ip_hash = v_ip_hash) >= 3 then
    return 'ip_limit';
  end if;
  insert into public.mvp_votes (poll_id, player_id, device_id, ip_hash)
  values (p_poll, p_player, p_device, v_ip_hash);
  return 'ok';
exception when unique_violation then
  return 'already_voted';
end;
$$;
revoke all on function public.mvp_vote(uuid, uuid, text) from public;
grant execute on function public.mvp_vote(uuid, uuid, text) to anon, authenticated;

-- Il candidato votato da un dispositivo, per mostrarlo anche dopo aver ricaricato la pagina
create or replace function public.mvp_my_vote(p_poll uuid, p_device text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select player_id from public.mvp_votes where poll_id = p_poll and device_id = p_device;
$$;
revoke all on function public.mvp_my_vote(uuid, text) from public;
grant execute on function public.mvp_my_vote(uuid, text) to anon, authenticated;
