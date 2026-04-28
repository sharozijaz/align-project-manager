import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { TaskFilters, type TaskFilter, type TaskSort } from "../components/tasks/TaskFilters";
import { TaskList } from "../components/tasks/TaskList";
import { TaskViewToggle } from "../components/tasks/TaskViewToggle";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus } from "../config/taskOptions";
import { useTaskViewPreference } from "../hooks/useTaskViewPreference";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import { isOverdue, isToday, isUpcoming } from "../utils/date";
export function Tasks() {
  const { projects } = useProjectStore();
  const { tasks, updateTask, deleteTask, completeTask } = useTaskStore();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TaskSort>("dueDate");
  const [view, setView] = useTaskViewPreference();

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.deletedAt)
      .filter((task) => {
        if (filter === "today") return isToday(task.dueDate);
        if (filter === "upcoming") return isUpcoming(task.dueDate);
        if (filter === "overdue") return !isTerminalTaskStatus(task.status) && isOverdue(task.dueDate);
        if (filter === "completed") return isTerminalTaskStatus(task.status);
        return !isTerminalTaskStatus(task.status);
      })
      .filter((task) => task.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sort === "priority") return getTaskPriorityOption(a.priority).rank - getTaskPriorityOption(b.priority).rank;
        if (sort === "status") return getTaskStatusOption(a.status).rank - getTaskStatusOption(b.status).rank;
        return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
      });
  }, [filter, search, sort, tasks]);

  return (
    <div className="space-y-4">
      <PageHeader title="Tasks" description="Search, filter, and sort every task across your workspace." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TaskFilters filter={filter} search={search} sort={sort} onFilterChange={setFilter} onSearchChange={setSearch} onSortChange={setSort} />
        <TaskViewToggle value={view} onChange={setView} />
      </div>
      <TaskList tasks={visibleTasks} projects={projects} onUpdate={updateTask} onDelete={deleteTask} onComplete={completeTask} view={view} />
    </div>
  );
}
