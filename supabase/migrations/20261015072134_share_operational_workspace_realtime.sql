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
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workspace_records'
  ) then
    alter publication supabase_realtime add table public.workspace_records;
  end if;
end
$$;