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
	using ((select auth.uid()) = owner_id)
	with check ((select auth.uid()) = owner_id);
