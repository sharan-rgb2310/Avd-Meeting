begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'rls-creator@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'rls-assignee@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'rls-participant@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'rls-outsider@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.meetings (id, ref, title, date, created_by)
values ('rls-meeting-visibility', 'RLS-VISIBILITY-TEST', 'RLS visibility test', current_date, '00000000-0000-0000-0000-000000000101');

insert into public.meeting_participants (meeting_id, user_id)
values ('rls-meeting-visibility', '00000000-0000-0000-0000-000000000103');

insert into public.shared_teams (id, data)
values (
  'rls-team-visibility',
  jsonb_build_object(
    'name', 'RLS visibility test',
    'createdBy', '00000000-0000-0000-0000-000000000101',
    'memberIds', jsonb_build_array('00000000-0000-0000-0000-000000000102')
  )
);

insert into public.workspace_records (owner_id, collection, record_id, data)
values (
  '00000000-0000-0000-0000-000000000104',
  'actionItems',
  'rls-action-item-visibility',
  jsonb_build_object(
    'id', 'rls-action-item-visibility',
    'title', 'RLS visibility test',
    'createdBy', '00000000-0000-0000-0000-000000000101',
    'assigneeId', '00000000-0000-0000-0000-000000000102',
    'meetingId', 'rls-meeting-visibility'
  )
);

insert into public.action_items (id, meeting_id, title, created_by, assignee_id)
values (
  'rls-action-item-visibility',
  'rls-meeting-visibility',
  'RLS visibility test',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102'
);

set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
do $$
begin
  if (select count(*) from public.shared_teams where id = 'rls-team-visibility') <> 1 then
    raise exception 'Team creator cannot read their team.';
  end if;
  if (select count(*) from public.workspace_records where record_id = 'rls-action-item-visibility') <> 1 then
    raise exception 'Action item creator cannot read the item.';
  end if;
  if (select count(*) from public.action_items where id = 'rls-action-item-visibility') <> 1 then
    raise exception 'Action item creator cannot read the normalized item.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
do $$
begin
  if (select count(*) from public.shared_teams where id = 'rls-team-visibility') <> 1 then
    raise exception 'Team member cannot read the team.';
  end if;
  if (select count(*) from public.workspace_records where record_id = 'rls-action-item-visibility') <> 1 then
    raise exception 'Action item assignee cannot read the item.';
  end if;
  if (select count(*) from public.action_items where id = 'rls-action-item-visibility') <> 1 then
    raise exception 'Action item assignee cannot read the normalized item.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
do $$
begin
  if (select count(*) from public.shared_teams where id = 'rls-team-visibility') <> 0 then
    raise exception 'Non-member can read a team.';
  end if;
  if (select count(*) from public.workspace_records where record_id = 'rls-action-item-visibility') <> 1 then
    raise exception 'Meeting participant cannot read the linked action item.';
  end if;
  if (select count(*) from public.action_items where id = 'rls-action-item-visibility') <> 1 then
    raise exception 'Meeting participant cannot read the normalized action item.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
do $$
begin
  if (select count(*) from public.shared_teams where id = 'rls-team-visibility') <> 0 then
    raise exception 'Unrelated user can read a team.';
  end if;
  if (select count(*) from public.workspace_records where record_id = 'rls-action-item-visibility') <> 0 then
    raise exception 'Unrelated row owner can read another user action item.';
  end if;
  if (select count(*) from public.action_items where id = 'rls-action-item-visibility') <> 0 then
    raise exception 'Unrelated user can read the normalized action item.';
  end if;
end;
$$;

reset role;
rollback;
