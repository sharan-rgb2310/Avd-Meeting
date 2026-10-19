create or replace function private.can_view_action_item(
  p_creator_id text,
  p_assignee_id text,
  p_meeting_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      p_creator_id = (select auth.uid())::text
      or p_assignee_id = (select auth.uid())::text
      or exists (
        select 1
        from public.shared_meetings as meeting
        where meeting.id = p_meeting_id
          and (
            meeting.owner_id = (select auth.uid())
            or (select auth.uid())::text = any(meeting.participant_ids)
          )
      )
      or exists (
        select 1
        from public.meetings as meeting
        where meeting.id = p_meeting_id
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
    );
$$;

revoke all on function private.can_view_action_item(text, text, text) from public, anon;
grant execute on function private.can_view_action_item(text, text, text) to authenticated;

create index if not exists shared_teams_member_ids_idx
  on public.shared_teams using gin ((coalesce(data -> 'memberIds', '[]'::jsonb)));
create index if not exists teams_member_ids_idx
  on public.teams using gin (member_ids);

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
drop trigger if exists prevent_shared_team_creator_change on public.shared_teams;
drop trigger if exists prevent_shared_team_identity_change on public.shared_teams;
create trigger prevent_shared_team_identity_change
  before update on public.shared_teams
  for each row execute function private.prevent_shared_team_identity_change();

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'workspace_records',
        'shared_teams',
        'teams',
        'action_items'
      ])
  loop
    execute format(
      'drop policy %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end
$$;

alter table public.workspace_records enable row level security;
alter table public.shared_teams enable row level security;
alter table public.teams enable row level security;
alter table public.action_items enable row level security;

revoke all on public.workspace_records, public.shared_teams, public.teams, public.action_items
  from public, anon;
grant select, insert, update, delete on public.workspace_records, public.shared_teams,
  public.teams, public.action_items to authenticated;

create policy "Workspace owners manage their records"
  on public.workspace_records
  for all
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
    and (
      collection <> 'actionItems'
      or (select private.can_view_action_item(
        data ->> 'createdBy',
        data ->> 'assigneeId',
        data ->> 'meetingId'
      ))
    )
  )
  with check (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
    and (
      collection <> 'actionItems'
      or (select private.can_view_action_item(
        data ->> 'createdBy',
        data ->> 'assigneeId',
        data ->> 'meetingId'
      ))
    )
  );

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
        and (select private.can_view_action_item(
          data ->> 'createdBy',
          data ->> 'assigneeId',
          data ->> 'meetingId'
        ))
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

create policy "Assigned users update action item status"
  on public.workspace_records
  for update
  to authenticated
  using (
    collection = 'actionItems'
    and owner_id <> (select auth.uid())
    and data ->> 'assigneeId' = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  )
  with check (
    collection = 'actionItems'
    and owner_id <> (select auth.uid())
    and data ->> 'assigneeId' = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create or replace function private.guard_workspace_action_item_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.collection = 'actionItems'
    and old.owner_id <> (select auth.uid())
    and old.data ->> 'assigneeId' = (select auth.uid())::text
    and (
      new.data - 'status' - 'updatedAt'
      is distinct from old.data - 'status' - 'updatedAt'
    ) then
    raise exception 'Assigned users may only change an action item status.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_workspace_action_item_update() from public, anon, authenticated;
drop trigger if exists guard_workspace_action_item_update on public.workspace_records;
create trigger guard_workspace_action_item_update
  before update on public.workspace_records
  for each row execute function private.guard_workspace_action_item_update();

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

create policy "Team creators create shared teams"
  on public.shared_teams
  for insert
  to authenticated
  with check (
    data ->> 'createdBy' = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

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

create policy "Team creators create teams"
  on public.teams
  for insert
  to authenticated
  with check (
    (select private.is_active_workspace_user())
    and created_by = (select auth.uid())::text
  );

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

create policy "Creators assignees and meeting collaborators read action items"
  on public.action_items
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.can_view_action_item(
      created_by,
      assignee_id,
      meeting_id
    ))
  );

create policy "Users create their own action items"
  on public.action_items
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Creators and assignees update action items"
  on public.action_items
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or assignee_id = (select auth.uid())::text
    )
  )
  with check (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or assignee_id = (select auth.uid())::text
    )
  );

create policy "Creators delete action items"
  on public.action_items
  for delete
  to authenticated
  using (
    created_by = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

notify pgrst, 'reload schema';