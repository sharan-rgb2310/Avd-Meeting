create table if not exists public.shared_teams (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_teams_created_at_idx
  on public.shared_teams (created_at desc);

insert into public.shared_teams (id, data)
select
  record_id,
  data - 'workspaceOwnerId' - 'workspaceShared' - 'sharedOwnerId'
from public.workspace_records
where collection = 'teams'
  and jsonb_typeof(data) = 'object'
on conflict (id) do nothing;

delete from public.workspace_records
where collection = 'teams'
  and jsonb_typeof(data) = 'object'
  and exists (
    select 1
    from public.shared_teams
    where shared_teams.id = workspace_records.record_id
  );

alter table public.shared_teams enable row level security;
revoke all on public.shared_teams from public, anon, authenticated;
grant select, insert, update, delete on public.shared_teams to authenticated;

drop policy if exists "Active users can read shared teams" on public.shared_teams;
create policy "Active users can read shared teams"
  on public.shared_teams
  for select
  to authenticated
  using ((select private.is_active_workspace_user()));

drop policy if exists "Active users can create shared teams" on public.shared_teams;
create policy "Active users can create shared teams"
  on public.shared_teams
  for insert
  to authenticated
  with check ((select private.is_active_workspace_user()));

drop policy if exists "Active users can update shared teams" on public.shared_teams;
create policy "Active users can update shared teams"
  on public.shared_teams
  for update
  to authenticated
  using ((select private.is_active_workspace_user()))
  with check ((select private.is_active_workspace_user()));

drop policy if exists "Active users can delete shared teams" on public.shared_teams;
create policy "Active users can delete shared teams"
  on public.shared_teams
  for delete
  to authenticated
  using ((select private.is_active_workspace_user()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shared_teams'
  ) then
    alter publication supabase_realtime add table public.shared_teams;
  end if;
end
$$;