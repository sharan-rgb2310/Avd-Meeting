create table if not exists public.profiles (
  id text primary key,
  email text not null unique,
  name text not null,
  role text,
  status text not null default 'Activated',
  department text,
  title text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
        and profile.status = 'Activated'
        and (account.banned_until is null or account.banned_until <= now())
    );
$$;

create table if not exists public.shared_teams (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_teams_created_at_idx
  on public.shared_teams (created_at desc);

alter table public.shared_teams enable row level security;
revoke all on public.shared_teams from public, anon, authenticated;
grant select, insert, update, delete on public.shared_teams to authenticated;

drop policy if exists "Active users can read shared teams" on public.shared_teams;
create policy "Active users can read shared teams"
  on public.shared_teams
  for select
  to authenticated
  using ((select private.is_active_workspace_user()));

drop policy if exists "Active users can create shared teams" on public.shared_teams;
create policy "Active users can create shared teams"
  on public.shared_teams
  for insert
  to authenticated
  with check ((select private.is_active_workspace_user()));

drop policy if exists "Active users can update shared teams" on public.shared_teams;
create policy "Active users can update shared teams"
  on public.shared_teams
  for update
  to authenticated
  using ((select private.is_active_workspace_user()))
  with check ((select private.is_active_workspace_user()));

drop policy if exists "Active users can delete shared teams" on public.shared_teams;
create policy "Active users can delete shared teams"
  on public.shared_teams
  for delete
  to authenticated
  using ((select private.is_active_workspace_user()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shared_teams'
  ) then
    alter publication supabase_realtime add table public.shared_teams;
  end if;
end
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

create table if not exists public.companies (
  id text primary key,
  name text not null,
  industry text,
  status text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id text primary key,
  name text not null,
  department text,
  lead_id text references public.profiles(id) on delete set null,
  status text not null default 'Active',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id text primary key,
  ref text not null unique,
  title text not null,
  company_id text references public.companies(id) on delete set null,
  company_name text,
  team_id text references public.teams(id) on delete set null,
  department text,
  date date not null,
  start_time time,
  end_time time,
  status text not null default 'Scheduled',
  type text not null default 'Virtual',
  responsible_id text references public.profiles(id) on delete set null,
  created_by text references public.profiles(id) on delete set null,
  agenda text,
  notes text,
  decisions text,
  action_items_text text,
  remarks text,
  reschedule_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meetings add column if not exists location text;
alter table public.meetings add column if not exists meeting_link text;

create table if not exists public.meeting_participants (
  meeting_id text not null references public.meetings(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  participant_type text not null default 'Team Member',
  primary key (meeting_id, user_id)
);

create table if not exists public.action_items (
  id text primary key,
  meeting_id text references public.meetings(id) on delete set null,
  company_id text references public.companies(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'To Do',
  priority text not null default 'Medium',
  assignee_id text references public.profiles(id) on delete set null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key,
  meeting_id text references public.meetings(id) on delete cascade,
  company_id text references public.companies(id) on delete cascade,
  name text not null,
  type text,
  size_bytes bigint,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  user_id text references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  message text,
  meeting_id text references public.meetings(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_settings (
  id text primary key default 'default',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_email_queue (
  id bigint generated by default as identity primary key,
  meeting_id text not null references public.meetings(id) on delete cascade,
  recipients jsonb not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists meetings_date_idx on public.meetings(date, start_time);
create index if not exists meeting_participants_user_idx on public.meeting_participants(user_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read, created_at desc);
create index if not exists email_queue_status_idx on public.meeting_email_queue(status, created_at);

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.teams enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.action_items enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.meeting_email_queue enable row level security;

drop policy if exists "Public can read meetings" on public.meetings;
create policy "Public can read meetings" on public.meetings
  for select to anon, authenticated using (true);

drop policy if exists "Public can read meeting participants" on public.meeting_participants;
create policy "Public can read meeting participants" on public.meeting_participants
  for select to anon, authenticated using (true);

drop policy if exists "Private profiles" on public.profiles;
create policy "Private profiles" on public.profiles
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Private companies" on public.companies;
create policy "Private companies" on public.companies
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Private teams" on public.teams;
create policy "Private teams" on public.teams
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Private action items" on public.action_items;
create policy "Private action items" on public.action_items
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Private documents" on public.documents;
create policy "Private documents" on public.documents
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Private notifications" on public.notifications;
create policy "Private notifications" on public.notifications
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Private workspace settings" on public.workspace_settings;
create policy "Private workspace settings" on public.workspace_settings
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "Private email queue" on public.meeting_email_queue;
create policy "Private email queue" on public.meeting_email_queue
  for all to anon, authenticated using (false) with check (false);

revoke all on public.meeting_email_queue from anon, authenticated;
revoke all on public.workspace_settings from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meetings'
  ) then
    alter publication supabase_realtime add table public.meetings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meeting_participants'
  ) then
    alter publication supabase_realtime add table public.meeting_participants;
  end if;
end $$;

create table if not exists public.workspace_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  collection text not null check (collection in (
    'users', 'companies', 'meetings', 'actionItems', 'documents',
    'teams', 'notifications', 'settings', 'activity'
  )),
  record_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, collection, record_id)
);

alter table public.workspace_records enable row level security;
revoke all on public.workspace_records from anon, authenticated;
grant select, insert, update, delete on public.workspace_records to authenticated;

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

drop policy if exists "Active users can read shared operational workspace records"
  on public.workspace_records;
create policy "Active users can read shared operational workspace records"
  on public.workspace_records
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and collection in ('companies', 'meetings', 'actionItems', 'documents', 'activity')
  );

drop policy if exists "Active users can update shared operational workspace records"
  on public.workspace_records;
create policy "Active users can update shared operational workspace records"
  on public.workspace_records
  for update
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and collection in ('companies', 'meetings', 'actionItems', 'documents', 'activity')
  )
  with check (
    (select private.is_active_workspace_user())
    and collection in ('companies', 'meetings', 'actionItems', 'documents', 'activity')
  );

drop policy if exists "Active users can delete shared operational workspace records"
  on public.workspace_records;
create policy "Active users can delete shared operational workspace records"
  on public.workspace_records
  for delete
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and collection in ('companies', 'meetings', 'actionItems', 'documents', 'activity')
  );

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'companies', 'teams', 'meetings', 'meeting_participants',
        'action_items', 'documents', 'notifications', 'workspace_settings',
        'meeting_email_queue', 'activity'
      )
  loop
    execute format('drop policy %I on public.%I', existing_policy.policyname, existing_policy.tablename);
  end loop;
end $$;

revoke all on table
  public.profiles,
  public.companies,
  public.teams,
  public.meetings,
  public.meeting_participants,
  public.action_items,
  public.documents,
  public.notifications,
  public.workspace_settings,
  public.meeting_email_queue,
  public.activity
from anon, authenticated;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
  signup_role text;
begin
  if new.email is null then
    return new;
  end if;

  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  signup_role := nullif(btrim(new.raw_user_meta_data ->> 'role'), '');
  if length(signup_role) > 80 then
    raise exception 'Role must be 80 characters or fewer.';
  end if;
  if lower(signup_role) = 'admin' then
    signup_role := 'Admin';
  end if;
  insert into public.profiles (
    id, email, name, role, status, department, title, created_at, updated_at
  )
  values (
    new.id::text,
    new.email,
    display_name,
    signup_role,
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

drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.sync_auth_user_profile();

drop trigger if exists on_auth_user_profile_updated on auth.users;
create trigger on_auth_user_profile_updated
  after update of email, raw_user_meta_data, email_confirmed_at on auth.users
  for each row execute function public.sync_auth_user_profile();

insert into public.profiles (
  id, email, name, role, status, department, title, created_at, updated_at
)
select
  account.id::text,
  account.email,
  coalesce(
    nullif(btrim(account.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(account.raw_user_meta_data ->> 'full_name'), ''),
    split_part(account.email, '@', 1)
  ),
  null,
  'Activated',
  nullif(btrim(account.raw_user_meta_data ->> 'department'), ''),
  nullif(btrim(account.raw_user_meta_data ->> 'title'), ''),
  coalesce(account.created_at, now()),
  now()
from auth.users as account
where account.email is not null
  and not exists (
    select 1
    from public.profiles as profile
    where profile.id = account.id::text
       or lower(profile.email) = lower(account.email)
  )
on conflict (id) do nothing;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_registered_auth_user(profile_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from auth.users as account
      where account.id::text = profile_id
    );
$$;

revoke all on function private.is_registered_auth_user(text) from public, anon, authenticated;
grant execute on function private.is_registered_auth_user(text) to authenticated;

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
      select count(*) into admin_count
      from public.profiles
      where role = 'Admin';
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
      select count(*) into admin_count
      from public.profiles
      where role = 'Admin';
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

drop policy if exists "Private profiles" on public.profiles;
drop policy if exists "Authenticated users can read directory profiles" on public.profiles;
create policy "Authenticated users can read directory profiles"
  on public.profiles
  for select
  to authenticated
  using (
    private.is_registered_auth_user(id)
    and (select private.is_active_workspace_user())
  );

revoke all on public.profiles from public, anon, authenticated;
grant select (id, email, name, department, title, created_at, role, status)
  on public.profiles to authenticated;

create or replace view public.user_directory
with (security_invoker = true)
as
select id, email, name, department, title, created_at, role, status
from public.profiles;

revoke all on public.user_directory from public, anon;
grant select on public.user_directory to authenticated;

create table if not exists public.shared_meetings (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  participant_ids text[] not null default '{}',
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_meetings_participant_ids_idx
  on public.shared_meetings using gin (participant_ids);

alter table public.shared_meetings enable row level security;
revoke all on public.shared_meetings from public, anon, authenticated;
grant select, insert, update, delete on public.shared_meetings to authenticated;

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

drop policy if exists "Workspace admins can read all shared meetings" on public.shared_meetings;
create policy "Workspace admins can read all shared meetings"
  on public.shared_meetings
  for select
  to authenticated
  using (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
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

drop policy if exists "Workspace admins can create shared meetings" on public.shared_meetings;
create policy "Workspace admins can create shared meetings"
  on public.shared_meetings
  for insert
  to authenticated
  with check (
    (select private.is_active_workspace_user())
    and (select private.is_admin_workspace_user())
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

drop policy if exists "Meeting owners can delete shared meetings" on public.shared_meetings;
create policy "Meeting owners can delete shared meetings"
  on public.shared_meetings
  for delete
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and (select private.is_active_workspace_user())
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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shared_meetings'
  ) then
    alter publication supabase_realtime add table public.shared_meetings;
  end if;
end
$$;