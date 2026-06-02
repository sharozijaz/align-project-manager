import { Select } from "../ui/Select";

export type TaskFilter = "all" | "today" | "upcoming" | "overdue" | "completed";
export type TaskSort = "manual" | "dueDate" | "priority" | "status";

export function TaskFilters({
  filter,
  sort,
  onFilterChange,
  onSortChange,
}: {
  filter: TaskFilter;
  sort: TaskSort;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort) => void;
}) {
  return (
    <div className="grid min-w-0 w-full gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)] sm:grid-cols-[180px_180px]">
      <Select className="align-field-quiet sm:min-h-10" value={filter} onChange={(event) => onFilterChange(event.target.value as TaskFilter)}>
        <option value="all">All</option>
        <option value="today">Today</option>
        <option value="upcoming">Upcoming</option>
        <option value="overdue">Overdue</option>
        <option value="completed">Done</option>
      </Select>
      <Select className="align-field-quiet sm:min-h-10" value={sort} onChange={(event) => onSortChange(event.target.value as TaskSort)}>
        <option value="manual">Manual order</option>
        <option value="dueDate">Due date</option>
        <option value="priority">Priority</option>
        <option value="status">Status</option>
      </Select>
    </div>
  );
}
