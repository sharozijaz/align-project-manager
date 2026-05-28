-- Cleanup deprecated collaboration and assignee artifacts after Align returned to
-- solo/local-first project workflows.
--
-- Run once in the Supabase SQL editor for hosted workspaces that previously
-- enabled collaboration. This does not remove client share links or
-- client-visible note flags.

do $$
begin
  if to_regclass('public.project_collaborators') is not null then
    drop policy if exists "Owners can manage project collaborators" on public.project_collaborators;
    drop policy if exists "Invitees can read their project collaborator records" on public.project_collaborators;
    drop policy if exists "Project collaborators can read their rows" on public.project_collaborators;
  end if;
end $$;

drop policy if exists "Collaborators can read shared projects" on public.projects;
drop policy if exists "Collaborators can read shared tasks" on public.tasks;
drop policy if exists "Collaborators can insert shared tasks" on public.tasks;
drop policy if exists "Collaborators can update shared tasks" on public.tasks;
drop policy if exists "Collaborators can delete shared tasks" on public.tasks;
drop policy if exists "Collaborators can read team-visible project notes" on public.hub_notes;

drop function if exists public.accept_project_collaborations();
drop function if exists public.can_edit_shared_project_task(text, uuid);
drop function if exists public.is_project_collaborator(uuid, uuid);

drop index if exists public.project_collaborators_project_id_idx;
drop index if exists public.project_collaborators_invitee_email_idx;
drop index if exists public.project_collaborators_invitee_user_id_idx;
drop index if exists public.tasks_assignee_email_idx;
drop index if exists public.tasks_assignee_user_id_idx;

drop table if exists public.project_collaborators;

alter table if exists public.hub_notes drop column if exists team_visible;
alter table if exists public.tasks drop column if exists assignee_email;
alter table if exists public.tasks drop column if exists assignee_user_id;
alter table if exists public.tasks drop column if exists assigned_by;
alter table if exists public.tasks drop column if exists assigned_at;

notify pgrst, 'reload schema';
