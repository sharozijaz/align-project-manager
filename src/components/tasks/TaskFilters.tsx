import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export type TaskFilter = "all" | "today" | "upcoming" | "overdue" | "completed";
export type TaskSort = "dueDate" | "priority" | "status";

export function TaskFilters({
  filter,
  search,
  sort,
  onFilterChange,
  onSearchChange,
  onSortChange,
}: {
  filter: TaskFilter;
  search: string;
  sort: TaskSort;
  onFilterChange: (filter: TaskFilter) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: TaskSort) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 md:grid-cols-[1fr_180px_180px]">
      <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search tasks" />
      <Select value={filter} onChange={(event) => onFilterChange(event.target.value as TaskFilter)}>
        <option value="all">All</option>
        <option value="today">Today</option>
        <option value="upcoming">Upcoming</option>
        <option value="overdue">Overdue</option>
        <option value="completed">Completed</option>
      </Select>
      <Select value={sort} onChange={(event) => onSortChange(event.target.value as TaskSort)}>
        <option value="dueDate">Due date</option>
        <option value="priority">Priority</option>
        <option value="status">Status</option>
      </Select>
    </div>
  );
}
