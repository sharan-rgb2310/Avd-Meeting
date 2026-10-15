drop index if exists public.profiles_single_admin_role_idx;

alter table public.profiles
  alter column role drop not null,
  alter column role drop default;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
begin
  if new.email is null then
    return new;
  end if;

  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  insert into public.profiles (
    id, email, name, role, status, department, title, created_at, updated_at
  )
  values (
    new.id::text,
    new.email,
    display_name,
    null,
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
        when new.email_confirmed_at is not null
          and public.profiles.status = 'Invited' then 'Activated'
        else public.profiles.status
      end,
      updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_auth_user_profile() from public, anon, authenticated;

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
        and profile.status = 'Activated'
        and (account.banned_until is null or account.banned_until <= now())
    );
$$;

revoke all on function private.is_active_workspace_user() from public, anon, authenticated;
grant execute on function private.is_active_workspace_user() to authenticated;

create or replace function private.is_admin_workspace_user()
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
        and profile.role = 'Admin'
        and profile.status = 'Activated'
        and (account.banned_until is null or account.banned_until <= now())
    );
$$;

revoke all on function private.is_admin_workspace_user() from public, anon, authenticated;
grant execute on function private.is_admin_workspace_user() to authenticated;

create or replace function private.enforce_workspace_admin_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  admin_count integer;
begin
  perform pg_advisory_xact_lock(1802968161, 1);

  if tg_op = 'INSERT' then
    if new.role = 'Admin' then
      if new.status = 'Inactive' then
        raise exception 'An inactive account cannot be assigned Admin access.';
      end if;
      select count(*) into admin_count from public.profiles where role = 'Admin';
      if admin_count >= 3 then
        new.role := null;
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.role is distinct from 'Admin' and new.role = 'Admin' then
      if new.status = 'Inactive' then
        raise exception 'An inactive account cannot be assigned Admin access.';
      end if;
      select count(*) into admin_count from public.profiles where role = 'Admin';
      if admin_count >= 3 then
        raise exception 'A maximum of three workspace administrators is allowed.';
      end if;
    end if;

    if old.role = 'Admin'
      and old.status = 'Activated'
      and (new.role is distinct from 'Admin' or new.status <> 'Activated') then
      select count(*) into admin_count
      from public.profiles
      where role = 'Admin'
        and status = 'Activated'
        and id <> old.id;
      if admin_count = 0 then
        raise exception 'At least one active workspace administrator must remain.';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'Admin' and old.status = 'Activated' then
      select count(*) into admin_count
      from public.profiles
      where role = 'Admin'
        and status = 'Activated'
        and id <> old.id;
      if admin_count = 0 then
        raise exception 'At least one active workspace administrator must remain.';
      end if;
    end if;
    return old;
  end if;

  return null;
end;
$$;

revoke all on function private.enforce_workspace_admin_limits() from public, anon, authenticated;
drop trigger if exists enforce_workspace_admin_role_limits on public.profiles;
drop trigger if exists enforce_workspace_admin_delete_limit on public.profiles;
create trigger enforce_workspace_admin_role_limits
  before insert or update of role, status on public.profiles
  for each row execute function private.enforce_workspace_admin_limits();
create trigger enforce_workspace_admin_delete_limit
  before delete on public.profiles
  for each row execute function private.enforce_workspace_admin_limits();

drop policy if exists "Workspace admins manage all workspace records" on public.workspace_records;
create policy "Workspace admins manage all workspace records"
  on public.workspace_records
  for all
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
    and collection in ('companies', 'meetings', 'actionItems')
  )
  with check (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
    and collection in ('companies', 'meetings', 'actionItems')
  );

drop policy if exists "Workspace admins can read all shared meetings" on public.shared_meetings;
create policy "Workspace admins can read all shared meetings"
  on public.shared_meetings
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
  );

drop policy if exists "Workspace admins can create shared meetings" on public.shared_meetings;
create policy "Workspace admins can create shared meetings"
  on public.shared_meetings
  for insert
  to authenticated
  with check (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
  );

drop policy if exists "Workspace admins can update shared meetings" on public.shared_meetings;
create policy "Workspace admins can update shared meetings"
  on public.shared_meetings
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

drop policy if exists "Workspace admins can delete shared meetings" on public.shared_meetings;
create policy "Workspace admins can delete shared meetings"
  on public.shared_meetings
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
  );