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
    'Team Member',
    'Activated',
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
      updated_at = now();

  return new;
end;
$$;
revoke all on function public.sync_auth_user_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.sync_auth_user_profile();
drop trigger if exists on_auth_user_profile_updated on auth.users;
create trigger on_auth_user_profile_updated
  after update of email, raw_user_meta_data on auth.users
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
  'Team Member',
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
drop policy if exists "Private profiles" on public.profiles;
drop policy if exists "Authenticated users can read directory profiles" on public.profiles;
create policy "Authenticated users can read directory profiles"
  on public.profiles
  for select
  to authenticated
  using (true);
revoke all on public.profiles from public, anon, authenticated;
grant select (id, email, name, department, title, created_at)
  on public.profiles to authenticated;
create or replace view public.user_directory
with (security_invoker = true)
as
select id, email, name, department, title, created_at
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
    (select auth.uid()) = owner_id
    or (select auth.uid())::text = any(participant_ids)
  );
drop policy if exists "Meeting owners can create shared meetings" on public.shared_meetings;
create policy "Meeting owners can create shared meetings"
  on public.shared_meetings
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);
drop policy if exists "Meeting owners can update shared meetings" on public.shared_meetings;
create policy "Meeting owners can update shared meetings"
  on public.shared_meetings
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
drop policy if exists "Meeting owners can delete shared meetings" on public.shared_meetings;
create policy "Meeting owners can delete shared meetings"
  on public.shared_meetings
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
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
