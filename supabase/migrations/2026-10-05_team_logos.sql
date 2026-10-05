-- Loghi di tutte le squadre delle competizioni (non solo gli avversari della
-- Victoria), usati nel tabellone e come logo di partenza quando una squadra
-- diventa avversaria in `matches`. `team_name` si confronta ignorando
-- maiuscole e spazi ai lati, come `teamKey` in src/lib/competitions.ts.
create table if not exists public.team_logos (
  team_name text primary key,
  logo_url text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists team_logos_key_idx on public.team_logos (lower(trim(team_name)));

alter table public.team_logos enable row level security;

drop policy if exists "public read team_logos" on public.team_logos;
create policy "public read team_logos" on public.team_logos
  for select using (true);

drop policy if exists "admin write team_logos" on public.team_logos;
create policy "admin write team_logos" on public.team_logos
  for all using (public.is_admin()) with check (public.is_admin());
