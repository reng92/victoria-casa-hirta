-- Ora del server per il conto alla rovescia dell'MVP, letta dal browser senza
-- passare da una funzione Vercel (sostituisce /api/time).
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$ select now() $$;

grant execute on function public.server_now() to anon, authenticated;
