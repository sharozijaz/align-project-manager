import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { TaskFilters, type TaskFilter, type TaskSort } from "../components/tasks/TaskFilters";
import { TaskList } from "../components/tasks/TaskList";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import { isOverdue, isToday, isUpcoming } from "../utils/date";
import type { Task } from "../types/task";

const priorityRank: Record<Task["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function Tasks() {
  const { projects } = useProjectStore();
  const { tasks, updateTask, deleteTask, completeTask } = useTaskStore();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TaskSort>("dueDate");

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.deletedAt)
      .filter((task) => {
        if (filter === "today") return isToday(task.dueDate);
        if (filter === "upcoming") return isUpcoming(task.dueDate);
        if (filter === "overdue") return task.status !== "completed" && isOverdue(task.dueDate);
        if (filter === "completed") return task.status === "completed";
        return true;
      })
      .filter((task) => task.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
        if (sort === "status") return a.status.localeCompare(b.status);
        return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
      });
  }, [filter, search, sort, tasks]);

  return (
    <div className="space-y-4">
      <PageHeader title="Tasks" description="Search, filter, and sort every task across your workspace." />
      <TaskFilters filter={filter} search={search} sort={sort} onFilterChange={setFilter} onSearchChange={setSearch} onSortChange={setSort} />
      <TaskList tasks={visibleTasks} projects={projects} onUpdate={updateTask} onDelete={deleteTask} onComplete={completeTask} />
    </div>
  );
}
