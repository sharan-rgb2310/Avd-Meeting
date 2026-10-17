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
        'meetings',
        'meeting_participants'
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
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;

revoke all on public.workspace_records, public.shared_meetings,
  public.meetings, public.meeting_participants
  from public, anon;
grant select, insert, update, delete on public.workspace_records,
  public.shared_meetings, public.meetings, public.meeting_participants
  to authenticated;

create policy "Meeting owners manage workspace records"
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
        and data ->> 'assigneeId' = (select auth.uid())::text
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

create policy "Meeting owners and participants read shared meetings"
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

create policy "Meeting owners create shared meetings"
  on public.shared_meetings
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
  );

create policy "Meeting owners update shared meetings"
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

create policy "Meeting owners delete shared meetings"
  on public.shared_meetings
  for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and (select private.is_active_workspace_user())
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

create policy "Users and meeting creators read participation"
  on public.meeting_participants
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      user_id = (select auth.uid())::text
      or (select private.is_meeting_creator(meeting_participants.meeting_id))
    )
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