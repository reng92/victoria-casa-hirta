-- Il pannello live propone anche cambi e rigori, ma il vincolo li rifiutava.
alter table public.match_events drop constraint if exists match_events_event_type_check;
alter table public.match_events add constraint match_events_event_type_check
  check (event_type in (
    'gol', 'autorete', 'ammonizione', 'espulsione', 'assist',
    'cambio', 'rigore_segnato', 'rigore_parato', 'rigore_sbagliato'
  ));
