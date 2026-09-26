-- Notifiche push senza registrazione.
-- I visitatori si iscrivono dal browser: l'iscrizione (endpoint + chiavi del
-- browser) si salva e si cancella solo tramite le funzioni push_subscribe e
-- push_unsubscribe; la tabella è leggibile solo dagli admin, che inviano le
-- notifiche da /adminwebapp/notifiche.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

drop policy if exists "admin read push_subscriptions" on public.push_subscriptions;
create policy "admin read push_subscriptions" on public.push_subscriptions
  for select using ((select public.is_admin()));
drop policy if exists "admin delete push_subscriptions" on public.push_subscriptions;
create policy "admin delete push_subscriptions" on public.push_subscriptions
  for delete using ((select public.is_admin()));

create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_subscriptions (endpoint, p256dh, auth)
  values (p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
$$;

-- L'endpoint è un URL segreto e non indovinabile: chi lo conosce è il browser iscritto
create or replace function public.push_unsubscribe(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke all on function public.push_subscribe(text, text, text) from public;
revoke all on function public.push_unsubscribe(text) from public;
grant execute on function public.push_subscribe(text, text, text) to anon, authenticated;
grant execute on function public.push_unsubscribe(text) to anon, authenticated;

-- Storico delle notifiche inviate
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  url text,
  match_id uuid references public.matches(id) on delete set null,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

drop policy if exists "admin write notifications" on public.notifications;
create policy "admin write notifications" on public.notifications
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

create index if not exists notifications_match_id_idx on public.notifications (match_id);
