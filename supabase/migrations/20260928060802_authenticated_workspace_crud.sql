create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.profiles
  add column if not exists auth_method text not null default 'Email',
  add column if not exists team_id text,
  add column if not exists last_seen timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
alter table public.companies
  add column if not exists contact_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists location text;
alter table public.teams
  add column if not exists member_ids jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();
alter table public.action_items add column if not exists updated_at timestamptz not null default now();
alter table public.meetings
  add column if not exists location text,
  add column if not exists meeting_link text,
  add column if not exists updated_at timestamptz not null default now();
alter table public.notifications add column if not exists link text;

create table if not exists public.activity (
  id text primary key,
  message text not null,
  entity text not null,
  entity_id text,
  company_id text references public.companies(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.activity enable row level security;

create or replace function private.is_workspace_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())::text and p.role = 'Admin' and p.status = 'Activated'
  );
$$;
create or replace function private.can_update_profile(target_id text, next_role text, next_status text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare current_profile public.profiles%rowtype;
begin
  if private.is_workspace_admin() then
    select * into current_profile from public.profiles where id = target_id;
    if current_profile.role = 'Admin'
      and (next_role <> 'Admin' or next_status <> 'Activated')
      and not exists (select 1 from public.profiles p where p.id <> target_id and p.role = 'Admin' and p.status = 'Activated') then
      return false;
    end if;
    return true;
  end if;
  return target_id = (select auth.uid())::text and exists (
    select 1 from public.profiles p where p.id = target_id and p.role = next_role and p.status = next_status
  );
end;
$$;
create or replace function private.can_delete_profile(target_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_workspace_admin() and not exists (
    select 1 from public.profiles target
    where target.id = target_id and target.role = 'Admin' and target.status = 'Activated'
      and not exists (
        select 1 from public.profiles other_admin
        where other_admin.id <> target_id and other_admin.role = 'Admin' and other_admin.status = 'Activated'
      )
  );
$$;
create or replace function private.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assigned_role text;
begin
  perform pg_catalog.pg_advisory_xact_lock(2026092801);
  assigned_role := case when exists (select 1 from public.profiles) then 'Team Member' else 'Admin' end;
  insert into public.profiles (id, email, name, role, status)
  values (new.id::text, new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    assigned_role, 'Activated')
  on conflict (id) do update set email = excluded.email, name = excluded.name, updated_at = now();
  return new;
end;
$$;
revoke all on function private.is_workspace_admin() from public, anon;
revoke all on function private.can_update_profile(text, text, text) from public, anon;
revoke all on function private.can_delete_profile(text) from public, anon;
revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;
grant execute on function private.is_workspace_admin() to authenticated;
grant execute on function private.can_update_profile(text, text, text) to authenticated;
grant execute on function private.can_delete_profile(text) to authenticated;
drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

drop policy if exists "Public can read meetings" on public.meetings;
drop policy if exists "Public can read meeting participants" on public.meeting_participants;
drop policy if exists "Private profiles" on public.profiles;
drop policy if exists "Private companies" on public.companies;
drop policy if exists "Private teams" on public.teams;
drop policy if exists "Private action items" on public.action_items;
drop policy if exists "Private documents" on public.documents;
drop policy if exists "Private notifications" on public.notifications;
drop policy if exists "Private workspace settings" on public.workspace_settings;
drop policy if exists "Private email queue" on public.meeting_email_queue;
revoke all on public.profiles, public.companies, public.teams, public.meetings,
  public.meeting_participants, public.action_items, public.documents, public.notifications,
  public.workspace_settings, public.meeting_email_queue, public.activity from anon, authenticated;

grant select, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.companies, public.teams, public.meetings,
  public.meeting_participants, public.action_items, public.documents, public.notifications, public.activity to authenticated;
create policy "Authenticated users read workspace profiles" on public.profiles for select to authenticated using (true);
create policy "Authenticated users update workspace profiles" on public.profiles for update to authenticated
  using (id = (select auth.uid())::text or (select private.is_workspace_admin()))
  with check ((select private.can_update_profile(id, role, status)));
create policy "Admins remove workspace profiles" on public.profiles for delete to authenticated
  using ((select private.can_delete_profile(id)));
create policy "Authenticated workspace CRUD companies" on public.companies for all to authenticated using (true) with check (true);
create policy "Authenticated workspace CRUD teams" on public.teams for all to authenticated using (true) with check (true);
create policy "Authenticated workspace CRUD meetings" on public.meetings for all to authenticated using (true) with check (true);
create policy "Authenticated workspace CRUD participants" on public.meeting_participants for all to authenticated using (true) with check (true);
create policy "Authenticated workspace CRUD action items" on public.action_items for all to authenticated using (true) with check (true);
create policy "Authenticated workspace CRUD documents" on public.documents for all to authenticated using (true) with check (true);
create policy "Authenticated workspace CRUD notifications" on public.notifications for all to authenticated using (true) with check (true);
create policy "Authenticated workspace CRUD activity" on public.activity for all to authenticated using (true) with check (true);
create policy "Authenticated workspace CRUD settings" on public.workspace_settings for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('meeting-documents', 'meeting-documents', false)
on conflict (id) do update set public = false;
drop policy if exists "Authenticated workspace files read" on storage.objects;
drop policy if exists "Authenticated workspace files insert" on storage.objects;
drop policy if exists "Authenticated workspace files update" on storage.objects;
drop policy if exists "Authenticated workspace files delete" on storage.objects;
create policy "Authenticated workspace files read" on storage.objects for select to authenticated using (bucket_id = 'meeting-documents');
create policy "Authenticated workspace files insert" on storage.objects for insert to authenticated with check (bucket_id = 'meeting-documents');
create policy "Authenticated workspace files update" on storage.objects for update to authenticated using (bucket_id = 'meeting-documents') with check (bucket_id = 'meeting-documents');
create policy "Authenticated workspace files delete" on storage.objects for delete to authenticated using (bucket_id = 'meeting-documents');

do $$
declare relation_name text;
begin
  foreach relation_name in array array['companies','teams','meetings','meeting_participants','action_items','documents','notifications','activity'] loop
    if not exists (
      select 1 from pg_publication_tables publication_table
      where publication_table.pubname = 'supabase_realtime'
        and publication_table.schemaname = 'public'
        and publication_table.tablename = relation_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', relation_name);
    end if;
  end loop;
end;
$$;;
