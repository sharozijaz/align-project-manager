alter table public.tasks
add column if not exists parent_task_id text references public.tasks(id) on delete cascade;

create index if not exists tasks_parent_task_id_idx on public.tasks(parent_task_id);

create or replace function public.ensure_task_subitem_parent()
returns trigger
language plpgsql
as $$
declare
  parent_row public.tasks%rowtype;
begin
  if new.parent_task_id is null then
    return new;
  end if;

  select *
  into parent_row
  from public.tasks
  where id = new.parent_task_id;

  if parent_row.id is null then
    raise exception 'Parent task does not exist.';
  end if;

  if parent_row.user_id <> new.user_id then
    raise exception 'Subitem parent must belong to the same user.';
  end if;

  if parent_row.parent_task_id is not null then
    raise exception 'Subitems cannot be nested under another subitem.';
  end if;

  if parent_row.project_id is distinct from new.project_id then
    raise exception 'Subitem parent must belong to the same project.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_task_subitem_parent_trigger on public.tasks;

create trigger ensure_task_subitem_parent_trigger
before insert or update of parent_task_id, user_id, project_id
on public.tasks
for each row
execute function public.ensure_task_subitem_parent();

notify pgrst, 'reload schema';
