-- Risultati di tutte le partite di campionati e coppe (anche quelle tra altre squadre).
-- Le partite della Victoria restano in `matches`; qui vanno le altre, con
-- home_team/away_team reali e punteggi reali (home_score = gol squadra di casa).
create table if not exists public.competition_results (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  match_date timestamptz,
  matchday integer,
  group_name text,
  round text,
  home_team text not null,
  away_team text not null,
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists competition_results_competition_idx
  on public.competition_results (competition_id, matchday, match_date);

alter table public.competition_results enable row level security;

drop policy if exists "public read competition_results" on public.competition_results;
create policy "public read competition_results" on public.competition_results
  for select using (true);

drop policy if exists "auth write competition_results" on public.competition_results;
create policy "auth write competition_results" on public.competition_results
  for all using ((select auth.role()) = 'authenticated') with check ((select auth.role()) = 'authenticated');
