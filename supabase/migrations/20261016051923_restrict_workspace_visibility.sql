alter table public.action_items
  add column if not exists created_by text references public.profiles(id) on delete set null;

alter table public.teams
  add column if not exists member_ids text[] not null default '{}';

update public.teams
set member_ids = array[lead_id]
where cardinality(member_ids) = 0
  and lead_id is not null;

update public.shared_teams
set data = jsonb_set(data, '{memberIds}', jsonb_build_array(data ->> 'leadId'), true)
where coalesce(data -> 'memberIds', '[]'::jsonb) = '[]'::jsonb
  and nullif(data ->> 'leadId', '') is not null;

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
        'shared_meetings',
        'shared_teams',
        'meetings',
        'meeting_participants',
        'action_items',
        'teams'
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
alter table public.shared_meetings enable row level security;
alter table public.shared_teams enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.action_items enable row level security;
alter table public.teams enable row level security;

create or replace function private.is_meeting_creator(meeting_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.meetings as meeting
      where meeting.id = $1
        and meeting.created_by = (select auth.uid())::text
    );
$$;

revoke all on function private.is_meeting_creator(text) from public, anon, authenticated;
grant execute on function private.is_meeting_creator(text) to authenticated;

create or replace function private.prevent_workspace_record_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
    or new.collection is distinct from old.collection
    or new.record_id is distinct from old.record_id then
    raise exception 'Workspace record identity cannot be changed.';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_workspace_record_identity_change() from public, anon, authenticated;
drop trigger if exists prevent_workspace_record_identity_change on public.workspace_records;
create trigger prevent_workspace_record_identity_change
  before update on public.workspace_records
  for each row execute function private.prevent_workspace_record_identity_change();

create or replace function private.prevent_action_item_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.created_by is distinct from old.created_by then
    raise exception 'Action item identity cannot be changed.';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_action_item_identity_change() from public, anon, authenticated;
drop trigger if exists prevent_action_item_identity_change on public.action_items;
create trigger prevent_action_item_identity_change
  before update on public.action_items
  for each row execute function private.prevent_action_item_identity_change();

create policy "Workspace owners manage their records"
  on public.workspace_records
  for all
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
  )
  with check (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
  );

create policy "Workspace collaborators read authorized records"
  on public.workspace_records
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      collection in ('companies', 'documents', 'activity')
      or (
        collection = 'meetings'
        and (
          owner_id = (select auth.uid())
          or coalesce(data -> 'participants', '[]'::jsonb)
            @> jsonb_build_array(jsonb_build_object('userId', (select auth.uid())::text))
        )
      )
      or (
        collection = 'actionItems'
        and (
          owner_id = (select auth.uid())
          or data ->> 'assigneeId' = (select auth.uid())::text
        )
      )
    )
  );

create policy "Workspace collaborators update shared records"
  on public.workspace_records
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      collection in ('companies', 'documents', 'activity')
      or (
        collection = 'actionItems'
        and (
          owner_id = (select auth.uid())
          or data ->> 'assigneeId' = (select auth.uid())::text
        )
      )
    )
  )
  with check (
    (select private.is_active_workspace_user())
    and collection in ('companies', 'documents', 'activity', 'actionItems')
  );

create policy "Workspace collaborators delete shared records"
  on public.workspace_records
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      collection in ('companies', 'documents', 'activity')
      or (
        collection = 'actionItems'
        and (
          owner_id = (select auth.uid())
          or data ->> 'assigneeId' = (select auth.uid())::text
        )
      )
    )
  );

create policy "Meeting creators and participants read shared meetings"
  on public.shared_meetings
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      owner_id = (select auth.uid())
      or (select auth.uid())::text = any(participant_ids)
    )
  );

create policy "Meeting creators create shared meetings"
  on public.shared_meetings
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
  );

create policy "Meeting creators update shared meetings"
  on public.shared_meetings
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
  )
  with check (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
  );

create policy "Meeting creators delete shared meetings"
  on public.shared_meetings
  for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
  );

create policy "Team members read shared teams"
  on public.shared_teams
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and coalesce(data -> 'memberIds', '[]'::jsonb)
      @> jsonb_build_array((select auth.uid())::text)
  );

create policy "Team members create shared teams"
  on public.shared_teams
  for insert
  to authenticated
  with check (
    (select private.is_active_workspace_user())
    and coalesce(data -> 'memberIds', '[]'::jsonb)
      @> jsonb_build_array((select auth.uid())::text)
  );

create policy "Team members update shared teams"
  on public.shared_teams
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and coalesce(data -> 'memberIds', '[]'::jsonb)
      @> jsonb_build_array((select auth.uid())::text)
  )
  with check ((select private.is_active_workspace_user()));

create policy "Team members delete shared teams"
  on public.shared_teams
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and coalesce(data -> 'memberIds', '[]'::jsonb)
      @> jsonb_build_array((select auth.uid())::text)
  );

create policy "Meeting creators and participants read meetings"
  on public.meetings
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or exists (
        select 1
        from public.meeting_participants as participant
        where participant.meeting_id = meetings.id
          and participant.user_id = (select auth.uid())::text
      )
    )
  );

create policy "Meeting creators create meetings"
  on public.meetings
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Meeting creators update meetings"
  on public.meetings
  for update
  to authenticated
  using (
    created_by = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  )
  with check (
    created_by = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Meeting creators delete meetings"
  on public.meetings
  for delete
  to authenticated
  using (
    created_by = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Users read their meeting participation"
  on public.meeting_participants
  for select
  to authenticated
  using (
    user_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Meeting creators manage participants"
  on public.meeting_participants
  for all
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.is_meeting_creator(meeting_participants.meeting_id))
  )
  with check (
    (select private.is_active_workspace_user())
    and (select private.is_meeting_creator(meeting_participants.meeting_id))
  );

create policy "Creators and assignees read action items"
  on public.action_items
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or assignee_id = (select auth.uid())::text
    )
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
  );

create policy "Creators and assignees delete action items"
  on public.action_items
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      created_by = (select auth.uid())::text
      or assignee_id = (select auth.uid())::text
    )
  );

create policy "Team members read teams"
  on public.teams
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select auth.uid())::text = any(member_ids)
  );

create policy "Team members create teams"
  on public.teams
  for insert
  to authenticated
  with check (
    (select private.is_active_workspace_user())
    and (select auth.uid())::text = any(member_ids)
  );

create policy "Team members update teams"
  on public.teams
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select auth.uid())::text = any(member_ids)
  )
  with check ((select private.is_active_workspace_user()));

create policy "Team members delete teams"
  on public.teams
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select auth.uid())::text = any(member_ids)
  );

insert into public.workspace_records (owner_id, collection, record_id, data, updated_at)
select
  meeting.owner_id,
  'actionItems',
  embedded.action_item ->> 'id',
  embedded.action_item,
  meeting.updated_at
from public.shared_meetings as meeting
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(meeting.data -> 'sharedActionItems') = 'array'
      then meeting.data -> 'sharedActionItems'
    else '[]'::jsonb
  end
) as embedded(action_item)
where embedded.action_item ->> 'id' is not null
on conflict (owner_id, collection, record_id) do nothing;

update public.shared_meetings
set data = data - 'sharedActionItems'
where data ? 'sharedActionItems';