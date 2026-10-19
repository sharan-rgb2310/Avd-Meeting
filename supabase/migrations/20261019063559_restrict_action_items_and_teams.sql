alter table public.shared_teams
  add column if not exists created_by text references public.profiles(id) on delete set null;
alter table public.teams
  add column if not exists created_by text references public.profiles(id) on delete set null;

alter table public.teams
  alter column created_by set default (auth.uid())::text;

create index if not exists shared_teams_created_by_idx
  on public.shared_teams (created_by);
create index if not exists shared_teams_member_ids_idx
  on public.shared_teams using gin ((coalesce(data -> 'memberIds', '[]'::jsonb)));
create index if not exists teams_created_by_idx
  on public.teams (created_by);
create index if not exists teams_member_ids_idx
  on public.teams using gin (member_ids);

create or replace function private.prevent_team_creator_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.created_by is distinct from old.created_by then
    raise exception 'Team identity cannot be changed.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_team_creator_change() from public, anon, authenticated;
drop trigger if exists prevent_shared_team_creator_change on public.shared_teams;
create trigger prevent_shared_team_creator_change
  before update on public.shared_teams
  for each row execute function private.prevent_team_creator_change();
drop trigger if exists prevent_team_creator_change on public.teams;
create trigger prevent_team_creator_change
  before update on public.teams
  for each row execute function private.prevent_team_creator_change();

drop policy if exists "Workspace collaborators read authorized records" on public.workspace_records;
drop policy if exists "Authorized collaborators read workspace records" on public.workspace_records;
create policy "Authorized collaborators read workspace records"
  on public.workspace_records
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      (
        collection = 'meetings'
        and (
          coalesce(data -> 'participants', '[]'::jsonb)
            @> jsonb_build_array(jsonb_build_object('userId', (select auth.uid())::text))
          or coalesce(data -> 'participants', '[]'::jsonb)
            @> jsonb_build_array((select auth.uid())::text)
          or exists (
            select 1
            from public.shared_meetings as meeting
            where meeting.id = workspace_records.record_id
              and (
                meeting.owner_id = (select auth.uid())
                or (select auth.uid())::text = any(meeting.participant_ids)
              )
          )
        )
      )
      or (
        collection = 'actionItems'
        and (
          owner_id = (select auth.uid())
          or data ->> 'assigneeId' = (select auth.uid())::text
          or exists (
            select 1
            from public.shared_meetings as meeting
            where meeting.id = workspace_records.data ->> 'meetingId'
              and (
                meeting.owner_id = (select auth.uid())
                or (select auth.uid())::text = any(meeting.participant_ids)
              )
          )
          or exists (
            select 1
            from public.meetings as meeting
            where meeting.id = workspace_records.data ->> 'meetingId'
              and (
                meeting.created_by = (select auth.uid())::text
                or exists (
                  select 1
                  from public.meeting_participants as participant
                  where participant.meeting_id = meeting.id
                    and participant.user_id = (select auth.uid())::text
                )
              )
          )
        )
      )
      or (
        collection = 'companies'
        and coalesce(data -> 'sharedWith', '[]'::jsonb)
          @> jsonb_build_array((select auth.uid())::text)
      )
      or (
        collection = 'documents'
        and (
          coalesce(data -> 'sharedWith', '[]'::jsonb)
            @> jsonb_build_array((select auth.uid())::text)
          or exists (
            select 1
            from public.shared_meetings as meeting
            where meeting.id = workspace_records.data ->> 'meetingId'
              and (
                meeting.owner_id = (select auth.uid())
                or (select auth.uid())::text = any(meeting.participant_ids)
              )
          )
        )
      )
    )
  );

drop policy if exists "Team members read shared teams" on public.shared_teams;
drop policy if exists "Active users can read shared teams" on public.shared_teams;
create policy "Team creators and members read shared teams"
  on public.shared_teams
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or coalesce(data -> 'memberIds', '[]'::jsonb)
        @> jsonb_build_array((select auth.uid())::text)
    )
  );

drop policy if exists "Team members create shared teams" on public.shared_teams;
drop policy if exists "Active users can create shared teams" on public.shared_teams;
create policy "Team creators create shared teams"
  on public.shared_teams
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

drop policy if exists "Team members update shared teams" on public.shared_teams;
drop policy if exists "Active users can update shared teams" on public.shared_teams;
create policy "Team creators and members update shared teams"
  on public.shared_teams
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or coalesce(data -> 'memberIds', '[]'::jsonb)
        @> jsonb_build_array((select auth.uid())::text)
    )
  )
  with check ((select private.is_active_workspace_user()));

drop policy if exists "Team members delete shared teams" on public.shared_teams;
drop policy if exists "Active users can delete shared teams" on public.shared_teams;
create policy "Team creators and members delete shared teams"
  on public.shared_teams
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or coalesce(data -> 'memberIds', '[]'::jsonb)
        @> jsonb_build_array((select auth.uid())::text)
    )
  );

drop policy if exists "Team members read teams" on public.teams;
create policy "Team creators and members read teams"
  on public.teams
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or member_ids @> array[(select auth.uid())::text]
    )
  );

drop policy if exists "Team members create teams" on public.teams;
create policy "Team creators create teams"
  on public.teams
  for insert
  to authenticated
  with check (
    (select private.is_active_workspace_user())
    and created_by = (select auth.uid())::text
  );

drop policy if exists "Team members update teams" on public.teams;
create policy "Team creators and members update teams"
  on public.teams
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or member_ids @> array[(select auth.uid())::text]
    )
  )
  with check ((select private.is_active_workspace_user()));

drop policy if exists "Team members delete teams" on public.teams;
create policy "Team creators and members delete teams"
  on public.teams
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or member_ids @> array[(select auth.uid())::text]
    )
  );

drop policy if exists "Creators and assignees read action items" on public.action_items;
create policy "Creators assignees and meeting collaborators read action items"
  on public.action_items
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or assignee_id = (select auth.uid())::text
      or exists (
        select 1
        from public.shared_meetings as meeting
        where meeting.id = action_items.meeting_id
          and (
            meeting.owner_id = (select auth.uid())
            or (select auth.uid())::text = any(meeting.participant_ids)
          )
      )
      or exists (
        select 1
        from public.meetings as meeting
        where meeting.id = action_items.meeting_id
          and (
            meeting.created_by = (select auth.uid())::text
            or exists (
              select 1
              from public.meeting_participants as participant
              where participant.meeting_id = meeting.id
                and participant.user_id = (select auth.uid())::text
            )
          )
      )
    )
  );

notify pgrst, 'reload schema';