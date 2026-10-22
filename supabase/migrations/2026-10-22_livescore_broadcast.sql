-- Livescore su Realtime Broadcast con canali privati "partita:<match_id>".
-- Sostituisce postgres_changes su matches, match_events, match_votes,
-- match_formations e match_commentary, che esauriva il Disk IO.
-- Va applicata PRIMA del deploy: senza queste policy i canali privati
-- rifiutano la sottoscrizione.
-- La RLS su realtime.messages è già attiva di default (e la tabella non è
-- nostra: "alter table ... enable row level security" fallisce).

-- Tutti (anche senza login) possono ricevere i messaggi delle partite
drop policy if exists "livescore read partita" on realtime.messages;
create policy "livescore read partita" on realtime.messages
  for select to anon, authenticated
  using (
    (select realtime.topic()) like 'partita:%'
    and realtime.messages.extension = 'broadcast'
  );

-- Solo gli admin inviano (stesso controllo delle policy "admin write <tabella>")
drop policy if exists "livescore admin send partita" on realtime.messages;
create policy "livescore admin send partita" on realtime.messages
  for insert to authenticated
  with check (
    (select realtime.topic()) like 'partita:%'
    and realtime.messages.extension = 'broadcast'
    and (select public.is_admin())
  );

-- Nessun client usa più postgres_changes: le tabelle escono dalla
-- pubblicazione realtime, così il database non decodifica più il loro WAL
do $$
declare
  t text;
begin
  foreach t in array array['matches', 'match_events', 'match_votes', 'match_formations', 'match_commentary'] loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;
