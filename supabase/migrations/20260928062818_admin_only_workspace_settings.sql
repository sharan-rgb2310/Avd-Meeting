drop policy if exists "Authenticated workspace CRUD settings" on public.workspace_settings;
revoke all on public.workspace_settings from anon, authenticated;
grant select, insert, update, delete on public.workspace_settings to authenticated;
create policy "Admins read workspace settings" on public.workspace_settings for select to authenticated using ((select private.is_workspace_admin()));
create policy "Admins create workspace settings" on public.workspace_settings for insert to authenticated with check ((select private.is_workspace_admin()));
create policy "Admins update workspace settings" on public.workspace_settings for update to authenticated using ((select private.is_workspace_admin())) with check ((select private.is_workspace_admin()));
create policy "Admins delete workspace settings" on public.workspace_settings for delete to authenticated using ((select private.is_workspace_admin()));;
