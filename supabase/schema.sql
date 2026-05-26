create table if not exists public.projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  area text not null default 'business' check (area in ('business', 'personal')),
  status text not null check (status in ('active', 'paused', 'completed', 'archived')),
  priority text not null check (priority in ('high', 'low', 'medium', 'urgent')),
  start_date date,
  start_time time,
  due_date date,
  due_time time,
  sort_order numeric,
  pinned_at timestamptz,
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  project_id text references public.projects(id) on delete set null,
  category text not null check (category in ('personal', 'work', 'project', 'meeting', 'chore')),
  priority text not null check (priority in ('high', 'low', 'medium', 'urgent')),
  status text not null check (status in ('not_started', 'in_progress', 'delivered', 'waiting', 'review', 'approved', 'done')),
  start_date date,
  start_time time,
  due_date date,
  due_time time,
  reminder text not null default 'none' check (reminder in ('none', 'due-date', 'day-before', 'two-days-before', 'week-before')),
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  recurring_parent_id text,
  parent_task_id text references public.tasks(id) on delete cascade,
  assignee_email text,
  assignee_user_id uuid references auth.users(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz,
  planned_month text,
  planned_week_start date,
  sort_order numeric,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.calendar_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date,
  linked_task_id text references public.tasks(id) on delete set null,
  source text not null check (source in ('local', 'google'))
);

create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  type text not null check (type in ('task-reminder')),
  title text not null,
  message text not null,
  scheduled_for timestamptz not null,
  read_at timestamptz,
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz not null default now(),
  unique (user_id, task_id, type, scheduled_for)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_resources (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text,
  type text not null check (type in ('inspiration', 'tools', 'assets', 'learning', 'snippets')),
  collection text,
  tags text,
  notes text,
  favorite boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.hub_notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  tags text,
  favorite boolean not null default false,
  client_visible boolean not null default false,
  project_ids text[] not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

alter table public.hub_notes
add column if not exists project_ids text[] not null default '{}';

alter table public.hub_notes
add column if not exists client_visible boolean not null default false;

alter table public.hub_notes
add column if not exists team_visible boolean not null default false;

alter table public.tasks
add column if not exists assignee_email text;

alter table public.tasks
add column if not exists assignee_user_id uuid references auth.users(id) on delete set null;

alter table public.tasks
add column if not exists assigned_by uuid references auth.users(id) on delete set null;

alter table public.tasks
add column if not exists assigned_at timestamptz;

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

create table if not exists public.project_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  token text not null unique,
  enabled boolean not null default true,
  password_hash text,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  token text not null unique,
  project_ids text[] not null default '{}',
  project_tokens text[] not null default '{}',
  enabled boolean not null default true,
  password_hash text,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_todo_sync_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  todo_list_id text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_todo_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  align_task_id text not null references public.tasks(id) on delete cascade,
  google_task_id text not null,
  google_list_id text not null,
  google_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, google_task_id, google_list_id)
);

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.notifications enable row level security;
alter table public.project_shares enable row level security;
alter table public.client_share_links enable row level security;
alter table public.user_preferences enable row level security;
alter table public.hub_resources enable row level security;
alter table public.hub_notes enable row level security;
alter table public.project_collaborators enable row level security;
alter table public.google_todo_sync_settings enable row level security;
alter table public.google_todo_links enable row level security;

create policy "Users can manage their own projects"
on public.projects
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own tasks"
on public.tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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
  and exists (
    select 1 from public.project_collaborators pc
    where pc.project_id = tasks.project_id
      and pc.status in ('invited', 'active')
      and (
        pc.invitee_user_id = auth.uid()
        or lower(pc.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

create policy "Collaborators can insert shared tasks"
on public.tasks
for insert
with check (
  project_id is not null
  and user_id = (select p.user_id from public.projects p where p.id = tasks.project_id)
  and exists (
    select 1 from public.project_collaborators pc
    where pc.project_id = tasks.project_id
      and pc.status in ('invited', 'active')
      and (
        pc.invitee_user_id = auth.uid()
        or lower(pc.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

create policy "Collaborators can update shared tasks"
on public.tasks
for update
using (
  project_id is not null
  and exists (
    select 1 from public.project_collaborators pc
    where pc.project_id = tasks.project_id
      and pc.status in ('invited', 'active')
      and (
        pc.invitee_user_id = auth.uid()
        or lower(pc.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
)
with check (
  project_id is not null
  and user_id = (select p.user_id from public.projects p where p.id = tasks.project_id)
  and exists (
    select 1 from public.project_collaborators pc
    where pc.project_id = tasks.project_id
      and pc.status in ('invited', 'active')
      and (
        pc.invitee_user_id = auth.uid()
        or lower(pc.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

create policy "Users can manage their own calendar events"
on public.calendar_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own notifications"
on public.notifications
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own project shares"
on public.project_shares
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own client share links"
on public.client_share_links
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own preferences"
on public.user_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own hub resources"
on public.hub_resources
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own hub notes"
on public.hub_notes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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

create policy "Users can manage their own Google Todo settings"
on public.google_todo_sync_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own Google Todo links"
on public.google_todo_links
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_start_date_idx on public.tasks(start_date);
create index if not exists tasks_user_sort_order_idx on public.tasks(user_id, sort_order);
create index if not exists tasks_parent_task_id_idx on public.tasks(parent_task_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assignee_email_idx on public.tasks(lower(assignee_email));
create index if not exists tasks_assignee_user_id_idx on public.tasks(assignee_user_id);
create index if not exists tasks_planned_month_idx on public.tasks(planned_month);
create index if not exists tasks_planned_week_start_idx on public.tasks(planned_week_start);
create index if not exists projects_start_date_idx on public.projects(start_date);
create index if not exists projects_user_sort_order_idx on public.projects(user_id, sort_order);
create index if not exists calendar_events_user_id_idx on public.calendar_events(user_id);
create index if not exists calendar_events_start_date_idx on public.calendar_events(start_date);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_scheduled_for_idx on public.notifications(scheduled_for);
create index if not exists notifications_read_at_idx on public.notifications(read_at);
create index if not exists notifications_email_sent_at_idx on public.notifications(email_sent_at);
create index if not exists project_shares_user_id_idx on public.project_shares(user_id);
create index if not exists project_shares_project_id_idx on public.project_shares(project_id);
create index if not exists project_shares_token_idx on public.project_shares(token);
create index if not exists project_shares_enabled_idx on public.project_shares(enabled);
create index if not exists client_share_links_user_id_idx on public.client_share_links(user_id);
create index if not exists client_share_links_token_idx on public.client_share_links(token);
create index if not exists client_share_links_enabled_idx on public.client_share_links(enabled);
create index if not exists user_preferences_email_reminders_idx on public.user_preferences(email_reminders_enabled);
create index if not exists hub_resources_user_id_idx on public.hub_resources(user_id);
create index if not exists hub_resources_type_idx on public.hub_resources(type);
create index if not exists hub_resources_collection_idx on public.hub_resources(collection);
create index if not exists hub_notes_user_id_idx on public.hub_notes(user_id);
create index if not exists hub_notes_team_visible_idx on public.hub_notes(team_visible);
create index if not exists hub_notes_project_ids_idx on public.hub_notes using gin(project_ids);
create index if not exists project_collaborators_project_id_idx on public.project_collaborators(project_id);
create index if not exists project_collaborators_owner_user_id_idx on public.project_collaborators(owner_user_id);
create index if not exists project_collaborators_invitee_email_idx on public.project_collaborators(lower(invitee_email));
create index if not exists project_collaborators_invitee_user_id_idx on public.project_collaborators(invitee_user_id);
create unique index if not exists google_todo_links_align_task_idx on public.google_todo_links(user_id, align_task_id);
create index if not exists google_todo_links_user_id_idx on public.google_todo_links(user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.project_shares to authenticated;
grant select, insert, update, delete on public.client_share_links to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.hub_resources to authenticated;
grant select, insert, update, delete on public.hub_notes to authenticated;
grant select, insert, update, delete on public.project_collaborators to authenticated;
grant select, insert, update, delete on public.google_todo_sync_settings to authenticated;
grant select, insert, update, delete on public.google_todo_links to authenticated;
grant select, insert, update, delete on public.projects to service_role;
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.calendar_events to service_role;
grant select, insert, update, delete on public.notifications to service_role;
grant select, insert, update, delete on public.project_shares to service_role;
grant select, insert, update, delete on public.client_share_links to service_role;
grant select, insert, update, delete on public.user_preferences to service_role;
grant select, insert, update, delete on public.hub_resources to service_role;
grant select, insert, update, delete on public.hub_notes to service_role;
grant select, insert, update, delete on public.project_collaborators to service_role;
grant select, insert, update, delete on public.google_todo_sync_settings to service_role;
grant select, insert, update, delete on public.google_todo_links to service_role;
