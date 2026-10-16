create or replace function public.delete_workspace_meeting(p_meeting_id text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_shared_meetings integer := 0;
  deleted_workspace_records integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required to delete a meeting.';
  end if;

  delete from public.shared_meetings
  where id = p_meeting_id
    and owner_id = (select auth.uid());
  get diagnostics deleted_shared_meetings = row_count;

  delete from public.workspace_records
  where owner_id = (select auth.uid())
    and collection = 'meetings'
    and record_id = p_meeting_id;
  get diagnostics deleted_workspace_records = row_count;

  if deleted_shared_meetings = 0 and deleted_workspace_records = 0 then
    raise exception 'Meeting was not found or cannot be deleted by this account.';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_workspace_meeting(text) from public, anon;
grant execute on function public.delete_workspace_meeting(text) to authenticated;