import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { TaskFilters, type TaskFilter, type TaskSort } from "../components/tasks/TaskFilters";
import { TaskForm } from "../components/tasks/TaskForm";
import { TaskList } from "../components/tasks/TaskList";
import { TaskViewToggle } from "../components/tasks/TaskViewToggle";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus } from "../config/taskOptions";
import { useTaskViewPreference } from "../hooks/useTaskViewPreference";
import { useTaskStore } from "../store/taskStore";
import { isOverdue, isToday, isUpcoming } from "../utils/date";

export function Todos() {
  const { tasks, addTask, updateTask, deleteTask, completeTask, reorderTasks } = useTaskStore();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TaskSort>("manual");
  const [view, setView] = useTaskViewPreference();

  const visibleTodos = useMemo(() => {
    return tasks
      .filter((task) => !task.deletedAt && task.category === "personal" && !task.projectId)
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
        if (sort === "dueDate") return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || b.createdAt.localeCompare(a.createdAt);
      });
  }, [filter, search, sort, tasks]);

  return (
    <div className="space-y-4">
      <PageHeader title="Todos" description="Personal todos synced with your Google Tasks list." />
      <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
        <TaskForm projects={[]} onSubmit={(input) => addTask({ ...input, category: "personal", projectId: undefined })} compact todoOnly />
      </section>
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-stretch">
        <TaskFilters filter={filter} search={search} sort={sort} onFilterChange={setFilter} onSearchChange={setSearch} onSortChange={setSort} />
        <TaskViewToggle value={view} onChange={setView} />
      </div>
      <TaskList
        tasks={visibleTodos}
        projects={[]}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onComplete={completeTask}
        view={view}
        onReorder={sort === "manual" ? reorderTasks : undefined}
        emptyText="No todos match this view."
      />
    </div>
  );
}
