grant usage on schema public to authenticated;
grant usage on schema public to service_role;

do $$
declare
  table_name text;
  table_names text[] := array[
    'projects',
    'tasks',
    'calendar_events',
    'notifications',
    'user_preferences',
    'project_shares',
    'client_share_links',
    'hub_resources',
    'hub_notes',
    'hub_note_spaces',
    'hub_palettes',
    'project_milestones',
    'hub_snippets',
    'google_todo_sync_settings',
    'google_todo_links',
    'google_task_bridge_settings',
    'google_task_links',
    'google_calendar_connections',
    'google_calendar_task_links'
  ];
begin
  foreach table_name in array table_names loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
      execute format('grant select, insert, update, delete on public.%I to service_role', table_name);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
