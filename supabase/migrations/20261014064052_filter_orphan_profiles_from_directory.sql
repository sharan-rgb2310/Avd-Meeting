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
drop policy if exists "Authenticated users can read directory profiles" on public.profiles;
create policy "Authenticated users can read directory profiles"
  on public.profiles
  for select
  to authenticated
  using (private.is_registered_auth_user(id));
