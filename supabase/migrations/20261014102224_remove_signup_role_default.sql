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

drop trigger if exists on_auth_user_created_create_profile on auth.users;