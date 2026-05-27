-- Project-scoped collaboration.
-- Run after supabase/schema.sql on existing hosted workspaces.

alter table public.tasks
add column if not exists assignee_email text;

alter table public.tasks
add column if not exists assignee_user_id uuid references auth.users(id) on delete set null;

alter table public.tasks
add column if not exists assigned_by uuid references auth.users(id) on delete set null;

alter table public.tasks
add column if not exists assigned_at timestamptz;

alter table public.tasks
add column if not exists planned_month text;

alter table public.tasks
add column if not exists planned_week_start date;

alter table public.hub_notes
add column if not exists team_visible boolean not null default false;

create table if not exists public.project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  invitee_user_id uuid references auth.users(id) on delete set null,
  role text not null default 'editor' check (role in ('editor')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, invitee_email)
);

alter table public.project_collaborators enable row level security;

create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assignee_email_idx on public.tasks(lower(assignee_email));
create index if not exists tasks_assignee_user_id_idx on public.tasks(assignee_user_id);
create index if not exists tasks_planned_month_idx on public.tasks(planned_month);
create index if not exists tasks_planned_week_start_idx on public.tasks(planned_week_start);
create index if not exists hub_notes_team_visible_idx on public.hub_notes(team_visible);
create index if not exists hub_notes_project_ids_idx on public.hub_notes using gin(project_ids);
create index if not exists project_collaborators_project_id_idx on public.project_collaborators(project_id);
create index if not exists project_collaborators_owner_user_id_idx on public.project_collaborators(owner_user_id);
create index if not exists project_collaborators_invitee_email_idx on public.project_collaborators(lower(invitee_email));
create index if not exists project_collaborators_invitee_user_id_idx on public.project_collaborators(invitee_user_id);

drop policy if exists "Collaborators can read shared projects" on public.projects;
drop policy if exists "Collaborators can read shared tasks" on public.tasks;
drop policy if exists "Collaborators can insert shared tasks" on public.tasks;
drop policy if exists "Collaborators can update shared tasks" on public.tasks;
drop policy if exists "Collaborators can read team-visible project notes" on public.hub_notes;
drop policy if exists "Owners can manage project collaborators" on public.project_collaborators;
drop policy if exists "Invitees can read their project collaborator records" on public.project_collaborators;

create or replace function public.can_edit_shared_project_task(task_project_id text, task_owner_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_collaborators pc
    join public.projects p on p.id = pc.project_id
    where pc.project_id = task_project_id
      and p.user_id = task_owner_user_id
      and pc.status in ('invited', 'active')
      and (
        pc.invitee_user_id = auth.uid()
        or lower(pc.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

grant execute on function public.can_edit_shared_project_task(text, uuid) to authenticated;

create policy "Collaborators can read shared projects"
on public.projects
for select
using (
  exists (
    select 1 from public.project_collaborators pc
    where pc.project_id = projects.id
      and pc.status in ('invited', 'active')
      and (
        pc.invitee_user_id = auth.uid()
        or lower(pc.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

create policy "Collaborators can read shared tasks"
on public.tasks
for select
using (
  project_id is not null
  and public.can_edit_shared_project_task(project_id, user_id)
);

create policy "Collaborators can update shared tasks"
on public.tasks
for update
using (
  project_id is not null
  and public.can_edit_shared_project_task(project_id, user_id)
)
with check (
  project_id is not null
  and public.can_edit_shared_project_task(project_id, user_id)
);

create policy "Collaborators can insert shared tasks"
on public.tasks
for insert
with check (
  project_id is not null
  and public.can_edit_shared_project_task(project_id, user_id)
);

create policy "Collaborators can read team-visible project notes"
on public.hub_notes
for select
using (
  team_visible = true
  and exists (
    select 1 from public.project_collaborators pc
    where pc.status in ('invited', 'active')
      and pc.project_id = any(hub_notes.project_ids)
      and (
        pc.invitee_user_id = auth.uid()
        or lower(pc.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

create policy "Owners can manage project collaborators"
on public.project_collaborators
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "Invitees can read their project collaborator records"
on public.project_collaborators
for select
using (
  invitee_user_id = auth.uid()
  or lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

grant select, insert, update, delete on public.project_collaborators to authenticated;
grant select, insert, update, delete on public.project_collaborators to service_role;
grant select, update on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.hub_notes to authenticated;

create or replace function public.accept_project_collaborations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_collaborators
  set status = 'active',
      invitee_user_id = auth.uid(),
      accepted_at = coalesce(accepted_at, now()),
      updated_at = now()
  where status = 'invited'
    and lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and (invitee_user_id is null or invitee_user_id = auth.uid());
end;
$$;

grant execute on function public.accept_project_collaborations() to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
