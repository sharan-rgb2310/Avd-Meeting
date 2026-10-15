do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meetings'
  ) then
    alter publication supabase_realtime add table public.meetings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meeting_participants'
  ) then
    alter publication supabase_realtime add table public.meeting_participants;
  end if;
end $$;;
