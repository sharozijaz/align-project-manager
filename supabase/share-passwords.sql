alter table public.project_shares
add column if not exists password_hash text;

alter table public.client_share_links
add column if not exists password_hash text;

grant select, insert, update, delete on public.project_shares to authenticated;
grant select, insert, update, delete on public.project_shares to service_role;
grant select, insert, update, delete on public.client_share_links to authenticated;
grant select, insert, update, delete on public.client_share_links to service_role;
