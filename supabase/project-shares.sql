create table if not exists public.project_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  token text not null unique,
  enabled boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_shares enable row level security;

drop policy if exists "Users can manage their own project shares"
on public.project_shares;

create policy "Users can manage their own project shares"
on public.project_shares
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists project_shares_user_id_idx on public.project_shares(user_id);
create index if not exists project_shares_project_id_idx on public.project_shares(project_id);
create index if not exists project_shares_token_idx on public.project_shares(token);
create index if not exists project_shares_enabled_idx on public.project_shares(enabled);

grant select, insert, update, delete on public.project_shares to authenticated;
grant select, insert, update, delete on public.project_shares to service_role;
