create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
  selected_role text;
begin
  if new.email is null then
    return new;
  end if;

  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  selected_role := case
    when new.raw_user_meta_data ->> 'role' = any (
      array['Manager', 'Group Manager', 'Editor', 'Viewer', 'Team Member', 'Manual Add']
    ) then new.raw_user_meta_data ->> 'role'
    else 'Team Member'
  end;

  insert into public.profiles (
    id, email, name, role, status, department, title, created_at, updated_at
  )
  values (
    new.id::text,
    new.email,
    display_name,
    selected_role,
    case when new.invited_at is not null and new.email_confirmed_at is null then 'Invited' else 'Activated' end,
    nullif(btrim(new.raw_user_meta_data ->> 'department'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'title'), ''),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      name = case
        when nullif(btrim(public.profiles.name), '') is null then excluded.name
        else public.profiles.name
      end,
      status = case
        when new.email_confirmed_at is not null then 'Activated'
        else public.profiles.status
      end,
      updated_at = now();

  return new;
end;
$$;
revoke all on function public.sync_auth_user_profile() from public, anon, authenticated;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_active_workspace_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles as profile
      join auth.users as account on account.id::text = profile.id
      where profile.id = (select auth.uid())::text
        and profile.status <> 'Inactive'
        and (account.banned_until is null or account.banned_until <= now())
    );
$$;
revoke all on function private.is_active_workspace_user() from public, anon, authenticated;
grant execute on function private.is_active_workspace_user() to authenticated;
do $$
declare
  admin_id uuid;
begin
  select id into admin_id
  from auth.users
  where lower(email) = lower('sharanithish@gmail.com');

  if admin_id is null then
    raise exception 'The designated workspace administrator account was not found.';
  end if;

  update public.profiles
  set role = 'Editor', updated_at = now()
  where role = 'Admin' and id <> admin_id::text;

  update public.profiles
  set role = 'Admin', status = 'Activated', updated_at = now()
  where id = admin_id::text;
end
$$;
drop policy if exists "Authenticated users can read directory profiles" on public.profiles;
create policy "Authenticated users can read directory profiles"
  on public.profiles
  for select
  to authenticated
  using (
    private.is_registered_auth_user(id)
    and (select private.is_active_workspace_user())
  );
drop policy if exists "Users manage their own workspace records" on public.workspace_records;
create policy "Users manage their own workspace records"
  on public.workspace_records
  for all
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and (select private.is_active_workspace_user())
  )
  with check (
    (select auth.uid()) = owner_id
    and (select private.is_active_workspace_user())
  );
drop policy if exists "Meeting owners and participants can read shared meetings"
  on public.shared_meetings;
create policy "Meeting owners and participants can read shared meetings"
  on public.shared_meetings
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (
      (select auth.uid()) = owner_id
      or (select auth.uid())::text = any(participant_ids)
    )
  );
drop policy if exists "Meeting owners can create shared meetings" on public.shared_meetings;
create policy "Meeting owners can create shared meetings"
  on public.shared_meetings
  for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and (select private.is_active_workspace_user())
  );
drop policy if exists "Meeting owners can update shared meetings" on public.shared_meetings;
create policy "Meeting owners can update shared meetings"
  on public.shared_meetings
  for update
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and (select private.is_active_workspace_user())
  )
  with check (
    (select auth.uid()) = owner_id
    and (select private.is_active_workspace_user())
  );
drop policy if exists "Meeting owners can delete shared meetings" on public.shared_meetings;
create policy "Meeting owners can delete shared meetings"
  on public.shared_meetings
  for delete
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and (select private.is_active_workspace_user())
  );
