create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
insert into public.workspaces (name)
values ('AV DYNAMICS')
on conflict (name) do nothing;
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'Team Member',
  membership_status text not null default 'pending'
    check (membership_status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  primary key (workspace_id, user_id),
  check (
    (membership_status = 'approved' and approved_at is not null)
    or membership_status <> 'approved'
  )
);
create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id, membership_status);
alter table public.workspace_records
  add column if not exists workspace_id uuid
  references public.workspaces(id) on delete cascade;
create unique index if not exists workspace_records_shared_record_uidx
  on public.workspace_records (workspace_id, collection, record_id)
  where workspace_id is not null;
revoke all on public.workspaces, public.workspace_members from anon, authenticated;
grant all on public.workspaces, public.workspace_members to service_role;
grant all on public.workspace_records to service_role;
create or replace function public.broadcast_workspace_membership_change()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  changed_workspace_id uuid;
begin
  if tg_op = 'DELETE' then
    changed_workspace_id := old.workspace_id;
  else
    changed_workspace_id := new.workspace_id;
  end if;

  perform realtime.send(
    '{}'::jsonb,
    'workspace_changed',
    'avdynamics-workspace-' || changed_workspace_id::text,
    false
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists workspace_members_broadcast_change on public.workspace_members;
create trigger workspace_members_broadcast_change
after insert or update or delete on public.workspace_members
for each row execute function public.broadcast_workspace_membership_change();
-- Memberships are never granted by signup or login. An administrator approves
-- each existing Auth user in the trusted database console:
-- insert into public.workspace_members (workspace_id, user_id, membership_status, approved_at)
-- select id, '<auth.users UUID>'::uuid, 'approved', now()
-- from public.workspaces where name = 'AV DYNAMICS'
-- on conflict (workspace_id, user_id) do update
-- set membership_status = 'approved', approved_at = now();
