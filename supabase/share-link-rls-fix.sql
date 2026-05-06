-- Repair RLS for Align share links.
-- Run this in Supabase SQL Editor if creating project/client share links fails with:
-- "new row violates row-level security policy for table project_shares"
--
-- This keeps share management private to the signed-in owner/member account.
-- Public read access still goes through the Vercel API using the service role key,
-- so anonymous users cannot browse these tables directly.

alter table public.project_shares enable row level security;
alter table public.client_share_links enable row level security;

grant select, insert, update, delete on public.project_shares to authenticated;
grant select, insert, update, delete on public.client_share_links to authenticated;
grant select, insert, update, delete on public.project_shares to service_role;
grant select, insert, update, delete on public.client_share_links to service_role;

drop policy if exists "Users can manage their own project shares" on public.project_shares;
drop policy if exists "Allowed users can manage their own project shares" on public.project_shares;
drop policy if exists "Project management users can manage their own project shares" on public.project_shares;
drop policy if exists "Users can manage their own client share links" on public.client_share_links;
drop policy if exists "Allowed users can manage their own client share links" on public.client_share_links;
drop policy if exists "Project management users can manage their own client share links" on public.client_share_links;

create policy "Project management users can select their own project shares"
on public.project_shares
for select
to authenticated
using (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
);

create policy "Project management users can insert their own project shares"
on public.project_shares
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
);

create policy "Project management users can update their own project shares"
on public.project_shares
for update
to authenticated
using (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
)
with check (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
);

create policy "Project management users can delete their own project shares"
on public.project_shares
for delete
to authenticated
using (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
);

create policy "Project management users can select their own client share links"
on public.client_share_links
for select
to authenticated
using (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
);

create policy "Project management users can insert their own client share links"
on public.client_share_links
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
);

create policy "Project management users can update their own client share links"
on public.client_share_links
for update
to authenticated
using (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
)
with check (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
);

create policy "Project management users can delete their own client share links"
on public.client_share_links
for delete
to authenticated
using (
  auth.uid() = user_id
  and (
    public.is_allowed_user()
    or public.app_user_has_feature('project_management')
  )
);
