-- Statistiche anonime su dispositivi: da quale piattaforma ci si iscrive alle
-- notifiche e quanti dispositivi hanno installato l'app (PWA).
-- Le iscrizioni precedenti restano con platform null: dall'endpoint si sa solo
-- il servizio push (Google/Apple/Mozilla/Microsoft), non il dispositivo.

alter table public.push_subscriptions
  add column if not exists platform text check (platform in ('android', 'ios', 'pc')),
  add column if not exists standalone boolean;

drop function if exists public.push_subscribe(text, text, text);
create or replace function public.push_subscribe(
  p_endpoint text, p_p256dh text, p_auth text,
  p_platform text default null, p_standalone boolean default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_subscriptions (endpoint, p256dh, auth, platform, standalone)
  values (p_endpoint, p_p256dh, p_auth, p_platform, p_standalone)
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh, auth = excluded.auth,
    platform = coalesce(excluded.platform, push_subscriptions.platform),
    standalone = coalesce(excluded.standalone, push_subscriptions.standalone);
$$;
revoke all on function public.push_subscribe(text, text, text, text, boolean) from public;
grant execute on function public.push_subscribe(text, text, text, text, boolean) to anon, authenticated;

-- Un dispositivo (id casuale salvato nel browser) che ha aperto l'app installata
create table if not exists public.app_installs (
  device_id text primary key check (length(device_id) between 8 and 64),
  platform text not null check (platform in ('android', 'ios', 'pc')),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.app_installs enable row level security;

drop policy if exists "admin read app_installs" on public.app_installs;
create policy "admin read app_installs" on public.app_installs
  for select using ((select public.is_admin()));

create or replace function public.track_install(p_device_id text, p_platform text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.app_installs (device_id, platform)
  values (p_device_id, p_platform)
  on conflict (device_id) do update set last_seen = now(), platform = excluded.platform;
$$;
revoke all on function public.track_install(text, text) from public;
grant execute on function public.track_install(text, text) to anon, authenticated;
