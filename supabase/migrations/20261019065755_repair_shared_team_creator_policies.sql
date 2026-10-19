drop trigger if exists prevent_shared_team_creator_change on public.shared_teams;
drop trigger if exists prevent_shared_team_identity_change on public.shared_teams;

create or replace function private.prevent_shared_team_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.data ->> 'createdBy' is distinct from old.data ->> 'createdBy' then
    raise exception 'Team identity cannot be changed.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_shared_team_identity_change() from public, anon, authenticated;
create trigger prevent_shared_team_identity_change
  before update on public.shared_teams
  for each row execute function private.prevent_shared_team_identity_change();

drop policy if exists "Team creators and members read shared teams" on public.shared_teams;
drop policy if exists "Team members read shared teams" on public.shared_teams;
drop policy if exists "Active users can read shared teams" on public.shared_teams;
create policy "Team creators and members read shared teams"
  on public.shared_teams
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      data ->> 'createdBy' = (select auth.uid())::text
      or coalesce(data -> 'memberIds', '[]'::jsonb)
        @> jsonb_build_array((select auth.uid())::text)
    )
  );

drop policy if exists "Team creators create shared teams" on public.shared_teams;
drop policy if exists "Team members create shared teams" on public.shared_teams;
drop policy if exists "Active users can create shared teams" on public.shared_teams;
create policy "Team creators create shared teams"
  on public.shared_teams
  for insert
  to authenticated
  with check (
    data ->> 'createdBy' = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

drop policy if exists "Team creators and members update shared teams" on public.shared_teams;
drop policy if exists "Team members update shared teams" on public.shared_teams;
drop policy if exists "Active users can update shared teams" on public.shared_teams;
create policy "Team creators and members update shared teams"
  on public.shared_teams
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      data ->> 'createdBy' = (select auth.uid())::text
      or coalesce(data -> 'memberIds', '[]'::jsonb)
        @> jsonb_build_array((select auth.uid())::text)
    )
  )
  with check ((select private.is_active_workspace_user()));

drop policy if exists "Team creators and members delete shared teams" on public.shared_teams;
drop policy if exists "Team members delete shared teams" on public.shared_teams;
drop policy if exists "Active users can delete shared teams" on public.shared_teams;
create policy "Team creators and members delete shared teams"
  on public.shared_teams
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      data ->> 'createdBy' = (select auth.uid())::text
      or coalesce(data -> 'memberIds', '[]'::jsonb)
        @> jsonb_build_array((select auth.uid())::text)
    )
  );

notify pgrst, 'reload schema';