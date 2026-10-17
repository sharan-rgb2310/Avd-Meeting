alter table public.companies
  add column if not exists owner_id text references public.profiles(id) on delete set null,
  add column if not exists shared_with text[] not null default '{}';
alter table public.documents
  add column if not exists owner_id text references public.profiles(id) on delete set null,
  add column if not exists shared_with text[] not null default '{}';
alter table public.activity
  add column if not exists owner_id text references public.profiles(id) on delete set null;

update public.companies as company
set owner_id = record_owner.owner_id
from (
  select wr.record_id, min(wr.owner_id::text) as owner_id
  from public.workspace_records as wr
  join public.profiles as profile on profile.id = wr.owner_id::text
  where wr.collection = 'companies'
  group by wr.record_id
  having count(distinct wr.owner_id) = 1
) as record_owner
where company.id = record_owner.record_id
  and company.owner_id is null;

update public.documents as document
set owner_id = record_owner.owner_id
from (
  select wr.record_id, min(wr.owner_id::text) as owner_id
  from public.workspace_records as wr
  join public.profiles as profile on profile.id = wr.owner_id::text
  where wr.collection = 'documents'
  group by wr.record_id
  having count(distinct wr.owner_id) = 1
) as record_owner
where document.id = record_owner.record_id
  and document.owner_id is null;

update public.activity as activity
set owner_id = record_owner.owner_id
from (
  select wr.record_id, min(wr.owner_id::text) as owner_id
  from public.workspace_records as wr
  join public.profiles as profile on profile.id = wr.owner_id::text
  where wr.collection = 'activity'
  group by wr.record_id
  having count(distinct wr.owner_id) = 1
) as record_owner
where activity.id = record_owner.record_id
  and activity.owner_id is null;

update public.action_items as item
set created_by = coalesce(
  item.created_by,
  (select profile.id from public.profiles as profile where profile.id = wr.data ->> 'createdBy'),
  (select profile.id from public.profiles as profile where profile.id = wr.owner_id::text)
)
from public.workspace_records as wr
where wr.collection = 'actionItems'
  and wr.record_id = item.id
  and item.created_by is null;

insert into storage.buckets (id, name, public)
values ('meeting-documents', 'meeting-documents', false)
on conflict (id) do update set public = false;

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
        'meeting_participants',
        'action_items',
        'companies',
        'documents',
        'notifications',
        'activity',
        'workspace_settings'
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
alter table public.action_items enable row level security;
alter table public.companies enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.activity enable row level security;
alter table public.workspace_settings enable row level security;

revoke all on public.workspace_records, public.shared_meetings, public.meetings,
  public.meeting_participants, public.action_items, public.companies,
  public.documents, public.notifications, public.activity, public.workspace_settings
  from public, anon;
grant select, insert, update, delete on public.workspace_records, public.shared_meetings,
  public.meetings, public.meeting_participants, public.action_items, public.companies,
  public.documents, public.notifications, public.activity, public.workspace_settings
  to authenticated;

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

create or replace function private.guard_action_item_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and old.created_by is distinct from (select auth.uid())::text
    and (
      pg_catalog.to_jsonb(new) - 'status' - 'updated_at'
      is distinct from pg_catalog.to_jsonb(old) - 'status' - 'updated_at'
    ) then
    raise exception 'Assigned users may only change an action item status.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_action_item_update() from public, anon, authenticated;
drop trigger if exists guard_action_item_update on public.action_items;
create trigger guard_action_item_update
  before update on public.action_items
  for each row execute function private.guard_action_item_update();

create policy "Company owners and explicitly shared users read companies"
  on public.companies
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      owner_id = (select auth.uid())::text
      or (select auth.uid())::text = any(shared_with)
    )
  );

create policy "Users create their own companies"
  on public.companies
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Company owners update companies"
  on public.companies
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  )
  with check (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Company owners delete companies"
  on public.companies
  for delete
  to authenticated
  using (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Document owners and explicitly shared users read documents"
  on public.documents
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      owner_id = (select auth.uid())::text
      or (select auth.uid())::text = any(shared_with)
      or (
        meeting_id is not null
        and exists (
          select 1
          from public.meetings as meeting
          where meeting.id = documents.meeting_id
        )
      )
    )
  );

create policy "Users create their own documents"
  on public.documents
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Document owners update documents"
  on public.documents
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  )
  with check (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Document owners delete documents"
  on public.documents
  for delete
  to authenticated
  using (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Users read their notifications"
  on public.notifications
  for select
  to authenticated
  using (
    user_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Users create their notifications"
  on public.notifications
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Users update their notifications"
  on public.notifications
  for update
  to authenticated
  using (
    user_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  )
  with check (
    user_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Users delete their notifications"
  on public.notifications
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Users manage their own activity"
  on public.activity
  for all
  to authenticated
  using (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  )
  with check (
    owner_id = (select auth.uid())::text
    and (select private.is_active_workspace_user())
  );

create policy "Active admins read workspace settings"
  on public.workspace_settings
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
  );

create policy "Active admins create workspace settings"
  on public.workspace_settings
  for insert
  to authenticated
  with check (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
  );

create policy "Active admins update workspace settings"
  on public.workspace_settings
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
  )
  with check (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
  );

create policy "Active admins delete workspace settings"
  on public.workspace_settings
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
  );

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname in (
          'Authenticated workspace files read',
          'Authenticated workspace files insert',
          'Authenticated workspace files update',
          'Authenticated workspace files delete'
        )
        or coalesce(qual, '') ilike '%meeting-documents%'
        or coalesce(with_check, '') ilike '%meeting-documents%'
        or (
          (
            cmd in ('SELECT', 'DELETE')
            and coalesce(qual, '') not ilike '%bucket_id%'
          )
          or (
            cmd = 'INSERT'
            and coalesce(with_check, '') not ilike '%bucket_id%'
          )
          or (
            cmd in ('UPDATE', 'ALL')
            and (
              coalesce(qual, '') not ilike '%bucket_id%'
              or coalesce(with_check, '') not ilike '%bucket_id%'
            )
          )
        )
      )
  loop
    execute format('drop policy %I on storage.objects', existing_policy.policyname);
  end loop;
end
$$;

create policy "Owners and explicitly shared users read meeting documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'meeting-documents'
    and (
      owner_id = (select auth.uid())::text
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.workspace_records as document
        where document.collection = 'documents'
          and document.data ->> 'fileKey' = objects.name
          and (
            document.owner_id = (select auth.uid())
            or coalesce(document.data -> 'sharedWith', '[]'::jsonb)
              @> jsonb_build_array((select auth.uid())::text)
            or exists (
              select 1
              from public.shared_meetings as meeting
              where meeting.id = document.data ->> 'meetingId'
                and (
                  meeting.owner_id = (select auth.uid())
                  or (select auth.uid())::text = any(meeting.participant_ids)
                )
            )
          )
      )
      or exists (
        select 1
        from public.documents as document
        where document.storage_path = objects.name
      )
    )
  );

create policy "Users upload documents to their own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'meeting-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update documents in their own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'meeting-documents'
    and (
      owner_id = (select auth.uid())::text
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.workspace_records as document
        where document.collection = 'documents'
          and document.data ->> 'fileKey' = objects.name
          and document.owner_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.documents as document
        where document.storage_path = objects.name
          and document.owner_id = (select auth.uid())::text
      )
    )
  )
  with check (
    bucket_id = 'meeting-documents'
    and (
      owner_id = (select auth.uid())::text
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.workspace_records as document
        where document.collection = 'documents'
          and document.data ->> 'fileKey' = objects.name
          and document.owner_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.documents as document
        where document.storage_path = objects.name
          and document.owner_id = (select auth.uid())::text
      )
    )
  );

create policy "Users delete their own documents"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'meeting-documents'
    and (
      owner_id = (select auth.uid())::text
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );