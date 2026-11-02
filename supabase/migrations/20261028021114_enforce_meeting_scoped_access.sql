alter table public.action_items add column if not exists created_by text references public.profiles(id) on delete set null;
alter table public.documents add column if not exists owner_id text references public.profiles(id) on delete set null, add column if not exists shared_with text[] not null default '{}';

create or replace function private.can_view_action_item(p_creator_id text, p_assignee_id text, p_meeting_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    (nullif(btrim(coalesce(p_meeting_id, '')), '') is null and (p_creator_id = (select auth.uid())::text or p_assignee_id = (select auth.uid())::text))
    or (nullif(btrim(coalesce(p_meeting_id, '')), '') is not null and (p_assignee_id = (select auth.uid())::text or exists (select 1 from public.shared_meetings m where m.id = p_meeting_id and ((select auth.uid()) = m.owner_id or (select auth.uid())::text = any(m.participant_ids))) or exists (select 1 from public.meetings m where m.id = p_meeting_id and exists (select 1 from public.meeting_participants p where p.meeting_id = m.id and p.user_id = (select auth.uid())::text))))
  );
$$;
revoke all on function private.can_view_action_item(text,text,text) from public, anon;
grant execute on function private.can_view_action_item(text,text,text) to authenticated;

create or replace function private.can_access_meeting(p_meeting_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (exists (select 1 from public.meetings m where m.id = p_meeting_id and exists (select 1 from public.meeting_participants p where p.meeting_id = m.id and p.user_id = (select auth.uid())::text)) or exists (select 1 from public.shared_meetings m where m.id = p_meeting_id and ((select auth.uid()) = m.owner_id or (select auth.uid())::text = any(m.participant_ids))));
$$;
revoke all on function private.can_access_meeting(text) from public, anon;
grant execute on function private.can_access_meeting(text) to authenticated;

create or replace function private.storage_document_meeting_id(p_name text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select nullif(btrim(r.data ->> 'meetingId'), '') from public.workspace_records r where r.collection = 'documents' and r.data ->> 'fileKey' = p_name limit 1), (select nullif(btrim(d.meeting_id), '') from public.documents d where d.storage_path = p_name limit 1));
$$;
revoke all on function private.storage_document_meeting_id(text) from public, anon;
grant execute on function private.storage_document_meeting_id(text) to authenticated;
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' and tablename in ('workspace_records','shared_teams','teams','action_items','documents') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "Workspace owners manage scoped records" on public.workspace_records for all to authenticated using (owner_id=(select auth.uid()) and private.is_active_workspace_user() and (collection <> 'actionItems' or private.can_view_action_item(data->>'createdBy',data->>'assigneeId',data->>'meetingId')) and (collection <> 'documents' or coalesce(nullif(btrim(data->>'meetingId'),''),'')='' or private.can_access_meeting(data->>'meetingId'))) with check (owner_id=(select auth.uid()) and private.is_active_workspace_user() and (collection <> 'actionItems' or private.can_view_action_item(data->>'createdBy',data->>'assigneeId',data->>'meetingId')) and (collection <> 'documents' or coalesce(nullif(btrim(data->>'meetingId'),''),'')='' or private.can_access_meeting(data->>'meetingId')));
create policy "Authorized users read scoped workspace records" on public.workspace_records for select to authenticated using (private.is_active_workspace_user() and ((collection='actionItems' and private.can_view_action_item(data->>'createdBy',data->>'assigneeId',data->>'meetingId')) or (collection='documents' and ((coalesce(nullif(btrim(data->>'meetingId'),''),'')='' and ((data->>'uploadedBy')=(select auth.uid())::text or coalesce(data->'sharedWith','[]'::jsonb) @> jsonb_build_array((select auth.uid())::text))) or (coalesce(nullif(btrim(data->>'meetingId'),''),'')<>'' and private.can_access_meeting(data->>'meetingId')))) or (collection='meetings' and private.can_access_meeting(record_id))));
create policy "Shared team members read teams" on public.shared_teams for select to authenticated using (private.is_active_workspace_user() and coalesce(data->'memberIds','[]'::jsonb) @> jsonb_build_array((select auth.uid())::text));
create policy "Shared team members write teams" on public.shared_teams for all to authenticated using (private.is_active_workspace_user() and coalesce(data->'memberIds','[]'::jsonb) @> jsonb_build_array((select auth.uid())::text)) with check (private.is_active_workspace_user() and coalesce(data->'memberIds','[]'::jsonb) @> jsonb_build_array((select auth.uid())::text));
create policy "Team members read teams" on public.teams for select to authenticated using (private.is_active_workspace_user() and coalesce(member_ids,'[]'::jsonb) @> jsonb_build_array((select auth.uid())::text));
create policy "Team members write teams" on public.teams for all to authenticated using (private.is_active_workspace_user() and coalesce(member_ids,'[]'::jsonb) @> jsonb_build_array((select auth.uid())::text)) with check (private.is_active_workspace_user() and coalesce(member_ids,'[]'::jsonb) @> jsonb_build_array((select auth.uid())::text));
create policy "Scoped users read action items" on public.action_items for select to authenticated using (private.is_active_workspace_user() and private.can_view_action_item(created_by,assignee_id,meeting_id));
create policy "Users create own action items" on public.action_items for insert to authenticated with check (created_by=(select auth.uid())::text and private.is_active_workspace_user());
create policy "Creators and assignees update action items" on public.action_items for update to authenticated using (private.is_active_workspace_user() and private.can_view_action_item(created_by,assignee_id,meeting_id) and (created_by=(select auth.uid())::text or assignee_id=(select auth.uid())::text)) with check (private.is_active_workspace_user() and private.can_view_action_item(created_by,assignee_id,meeting_id) and (created_by=(select auth.uid())::text or assignee_id=(select auth.uid())::text));
create policy "Creators delete action items" on public.action_items for delete to authenticated using (created_by=(select auth.uid())::text and private.is_active_workspace_user() and private.can_view_action_item(created_by,assignee_id,meeting_id));
create policy "Scoped users read documents" on public.documents for select to authenticated using (private.is_active_workspace_user() and ((meeting_id is null and (owner_id=(select auth.uid())::text or (select auth.uid())::text=any(shared_with))) or (meeting_id is not null and private.can_access_meeting(meeting_id::text))));
create policy "Users create own documents" on public.documents for insert to authenticated with check (owner_id=(select auth.uid())::text and private.is_active_workspace_user());
create policy "Document owners update documents" on public.documents for update to authenticated using (owner_id=(select auth.uid())::text and private.is_active_workspace_user()) with check (owner_id=(select auth.uid())::text and private.is_active_workspace_user());
create policy "Document owners delete documents" on public.documents for delete to authenticated using (owner_id=(select auth.uid())::text and private.is_active_workspace_user());

notify pgrst, 'reload schema';

do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='storage' and tablename='objects' and coalesce(qual,'') ilike '%meeting-documents%' loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;
create policy "Meeting participants read documents" on storage.objects for select to authenticated using (bucket_id='meeting-documents' and ((private.storage_document_meeting_id(objects.name) is not null and private.can_access_meeting(private.storage_document_meeting_id(objects.name))) or (private.storage_document_meeting_id(objects.name) is null and ((storage.foldername(objects.name))[1]=(select auth.uid())::text or owner_id=(select auth.uid())::text))));
create policy "Users upload documents to own folder" on storage.objects for insert to authenticated with check (bucket_id='meeting-documents' and (storage.foldername(objects.name))[1]=(select auth.uid())::text);
create policy "Users update own document files" on storage.objects for update to authenticated using (bucket_id='meeting-documents' and ((storage.foldername(objects.name))[1]=(select auth.uid())::text or (private.storage_document_meeting_id(objects.name) is not null and private.can_access_meeting(private.storage_document_meeting_id(objects.name))))) with check (bucket_id='meeting-documents' and ((storage.foldername(objects.name))[1]=(select auth.uid())::text or (private.storage_document_meeting_id(objects.name) is not null and private.can_access_meeting(private.storage_document_meeting_id(objects.name)))));
create policy "Users delete own document files" on storage.objects for delete to authenticated using (bucket_id='meeting-documents' and ((storage.foldername(objects.name))[1]=(select auth.uid())::text or (private.storage_document_meeting_id(objects.name) is not null and private.can_access_meeting(private.storage_document_meeting_id(objects.name)))));

create or replace function private.guard_action_item_update() returns trigger language plpgsql set search_path='' as $$
begin
  if (select auth.uid()) is not null and old.assignee_id=(select auth.uid())::text and old.created_by is distinct from (select auth.uid())::text and to_jsonb(new)-'status'-'updated_at' is distinct from to_jsonb(old)-'status'-'updated_at' then
    raise exception 'Assigned users may only change an action item status.' using errcode='42501';
  end if;
  return new;
end
$$;
revoke all on function private.guard_action_item_update() from public, anon, authenticated;
drop trigger if exists guard_action_item_update on public.action_items;
create trigger guard_action_item_update before update on public.action_items for each row execute function private.guard_action_item_update();
