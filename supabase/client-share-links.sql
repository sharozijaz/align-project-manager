create table if not exists public.client_share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  token text not null unique,
  project_ids text[] not null default '{}',
  project_tokens text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_share_links enable row level security;

drop policy if exists "Users can manage their own client share links" on public.client_share_links;

create policy "Users can manage their own client share links"
on public.client_share_links
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists client_share_links_user_id_idx on public.client_share_links(user_id);
create index if not exists client_share_links_token_idx on public.client_share_links(token);
create index if not exists client_share_links_enabled_idx on public.client_share_links(enabled);

grant select, insert, update, delete on public.client_share_links to authenticated;
grant select, insert, update, delete on public.client_share_links to service_role;
