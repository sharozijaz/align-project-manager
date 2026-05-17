import { Search } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export type TaskFilter = "all" | "today" | "upcoming" | "overdue" | "completed";
export type TaskSort = "manual" | "dueDate" | "priority" | "status";

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
    <div className="grid min-w-0 w-full gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)] md:grid-cols-[minmax(0,1fr)_180px_180px]">
      <label className="relative block min-w-0 flex-1">
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
        <Input className="align-field-quiet pl-10 sm:min-h-10" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search tasks" />
      </label>
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
