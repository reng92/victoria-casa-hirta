-- Solo gli admin in elenco possono modificare il sito.
-- Prima bastava essere autenticati; lo storage "media" accettava upload
-- anche da utenti anonimi.

create table if not exists public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- security definer: legge admins senza passare dalla sua RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins
  for select using ((select public.is_admin()));

insert into public.admins (email) values
  ('renatogambardella@gmail.com'),
  ('marco.aulicino10@gmail.com')
on conflict do nothing;

-- Tabelle del sito: lettura pubblica invariata, scrittura solo admin
do $$
declare
  t record;
begin
  for t in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and cmd = 'ALL' and policyname like 'auth write%'
  loop
    execute format('drop policy %I on public.%I', t.policyname, t.tablename);
    execute format(
      'create policy %I on public.%I for all using ((select public.is_admin())) with check ((select public.is_admin()))',
      'admin write ' || t.tablename, t.tablename
    );
  end loop;
end $$;

-- Storage: lettura pubblica, scrittura solo admin
drop policy if exists "allow public uploads" on storage.objects;
drop policy if exists "allow public updates" on storage.objects;
drop policy if exists "admin insert media" on storage.objects;
drop policy if exists "admin update media" on storage.objects;
drop policy if exists "admin delete media" on storage.objects;
create policy "admin insert media" on storage.objects
  for insert with check (bucket_id = 'media' and (select public.is_admin()));
create policy "admin update media" on storage.objects
  for update using (bucket_id = 'media' and (select public.is_admin()));
create policy "admin delete media" on storage.objects
  for delete using (bucket_id = 'media' and (select public.is_admin()));
