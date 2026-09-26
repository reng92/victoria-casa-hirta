-- Cronaca della partita:
--  * match_report: resoconto testuale libero, compilabile anche a partita finita
--  * match_commentary: cronaca live minuto per minuto (testo + minuto)
alter table public.matches add column if not exists match_report text;

create table if not exists public.match_commentary (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  minute integer check (minute >= 0),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists match_commentary_match_idx
  on public.match_commentary (match_id, minute, created_at);

alter table public.match_commentary enable row level security;

drop policy if exists "public read match_commentary" on public.match_commentary;
create policy "public read match_commentary" on public.match_commentary
  for select using (true);

drop policy if exists "auth write match_commentary" on public.match_commentary;
create policy "auth write match_commentary" on public.match_commentary
  for all using ((select auth.role()) = 'authenticated') with check ((select auth.role()) = 'authenticated');

-- Aggiornamenti live sulla pagina partita
alter publication supabase_realtime add table public.match_commentary;
