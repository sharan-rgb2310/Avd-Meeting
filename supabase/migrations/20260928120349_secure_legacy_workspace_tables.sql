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

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
