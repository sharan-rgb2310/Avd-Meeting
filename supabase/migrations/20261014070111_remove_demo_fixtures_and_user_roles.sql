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
      array['Admin', 'Manager', 'Group Manager', 'Editor', 'Viewer', 'Team Member', 'Manual Add']
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
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.sync_auth_user_profile();
drop trigger if exists on_auth_user_profile_updated on auth.users;
create trigger on_auth_user_profile_updated
  after update of email, raw_user_meta_data, email_confirmed_at on auth.users
  for each row execute function public.sync_auth_user_profile();
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
delete from public.workspace_records
where (collection = 'users' and record_id = any (array['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_5', 'usr_6', 'usr_7']))
   or (collection = 'teams' and record_id = any (array['tm_1', 'tm_2', 'tm_3', 'tm_4', 'tm_5', 'tm_6', 'tm_7']))
   or (collection = 'companies' and record_id = any (array['cmp_1', 'cmp_2', 'cmp_3', 'cmp_4', 'cmp_5', 'cmp_6', 'cmp_7']))
   or (collection = 'meetings' and record_id = any (array['mtg_1', 'mtg_2', 'mtg_3', 'mtg_4', 'mtg_5', 'mtg_6', 'mtg_7', 'mtg_8']))
   or (collection = 'actionItems' and record_id = any (array['act_1', 'act_2', 'act_3', 'act_4', 'act_5', 'act_6', 'act_7', 'act_8', 'act_9', 'act_10']))
   or (collection = 'documents' and record_id = any (array['doc_1', 'doc_2', 'doc_3', 'doc_4', 'doc_5', 'doc_6', 'doc_7', 'doc_8']))
   or (collection = 'notifications' and record_id = any (array['ntf_1', 'ntf_2', 'ntf_3', 'ntf_4', 'ntf_5']))
   or (collection = 'activity' and record_id = any (array['atv_1', 'atv_2', 'atv_3', 'atv_4']));
delete from public.shared_meetings
where id = any (array['mtg_1', 'mtg_2', 'mtg_3', 'mtg_4', 'mtg_5', 'mtg_6', 'mtg_7', 'mtg_8']);
update public.workspace_records
set data = jsonb_set(data, '{auth,defaultTeamId}', '""'::jsonb, true)
where collection = 'settings'
  and record_id = 'default'
  and data -> 'auth' ->> 'defaultTeamId' = 'tm_1';
