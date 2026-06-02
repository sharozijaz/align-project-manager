import { CalendarDays, Check, Circle, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ScopedSearchNotice } from "../components/ui/ScopedSearchNotice";
import { getTaskPriorityOption, isTerminalTaskStatus } from "../config/taskOptions";
import { useSearchStore } from "../store/searchStore";
import { useTaskStore } from "../store/taskStore";
import type { Task, TaskInput } from "../types/task";
import { dateLabel, isOverdue, isToday, isUpcoming } from "../utils/date";
import { priorityTone, taskDateTone } from "../utils/taskVisuals";

type TodoFilter = "open" | "today" | "upcoming" | "completed";

export function Todos() {
  const { tasks, addTask, updateTask, deleteTask, completeTask } = useTaskStore();
  const [filter, setFilter] = useState<TodoFilter>("open");
  const search = useSearchStore((state) => state.query);
  const clearSearch = useSearchStore((state) => state.clearQuery);
  const [title, setTitle] = useState("");

  const todos = useMemo(() => {
    return tasks
      .filter((task) => !task.deletedAt && task.category === "personal" && !task.projectId)
      .filter((task) => {
        if (filter === "today") return !isTerminalTaskStatus(task.status) && isToday(task.dueDate);
        if (filter === "upcoming") return !isTerminalTaskStatus(task.status) && isUpcoming(task.dueDate);
        if (filter === "completed") return isTerminalTaskStatus(task.status);
        return !isTerminalTaskStatus(task.status);
      })
      .filter((task) => task.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (filter === "completed") return b.updatedAt.localeCompare(a.updatedAt);
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
      });
  }, [filter, search, tasks]);

  const counts = useMemo(() => {
    const personal = tasks.filter((task) => !task.deletedAt && task.category === "personal" && !task.projectId);
    return {
      open: personal.filter((task) => !isTerminalTaskStatus(task.status)).length,
      today: personal.filter((task) => !isTerminalTaskStatus(task.status) && isToday(task.dueDate)).length,
      upcoming: personal.filter((task) => !isTerminalTaskStatus(task.status) && isUpcoming(task.dueDate)).length,
      completed: personal.filter((task) => isTerminalTaskStatus(task.status)).length,
    };
  }, [tasks]);

  const addTodo = () => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    addTask({
      title: nextTitle,
      description: undefined,
      projectId: undefined,
      category: "personal",
      priority: "medium",
      status: "not_started",
      startDate: undefined,
      startTime: undefined,
      dueDate: undefined,
      dueTime: undefined,
      reminder: "none",
      recurrence: "none",
      parentTaskId: undefined,
      plannedMonth: undefined,
      plannedWeekStart: undefined,
      sortOrder: undefined,
    });
    setTitle("");
    setFilter("open");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Todos" description="Personal checklist items for quick capture and completion." />
      <ScopedSearchNotice query={search} scope="todos" resultCount={todos.length} onClear={clearSearch} />

      <section className="rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3">
            <Plus size={16} className="text-[var(--text-soft)]" />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addTodo();
              }}
              className="min-h-11 min-w-0 bg-transparent text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--input-placeholder)]"
              placeholder="Add a todo"
            />
          </label>
          <Button onClick={addTodo} disabled={!title.trim()}>
            Add Todo
          </Button>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--panel-inset)] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {todoFilters.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`min-h-9 rounded-[var(--radius-sm)] border px-3 text-sm font-bold transition ${
                    filter === option.value
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                      : "border-[var(--border)] bg-[var(--panel-bg)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  }`}
                >
                  {option.label} <span className="ml-1 opacity-70">{counts[option.value]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {todos.length ? (
              todos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  onComplete={completeTask}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                />
              ))
            ) : (
              <div className="p-10 text-center text-sm text-[var(--text-muted)]">
                {search.trim() ? "No todos match this search and filter combination." : "No todos match this view."}
              </div>
            )}
          </div>
        </main>

        <aside className="space-y-3">
          <SummaryCard label="Open" value={counts.open} />
          <SummaryCard label="Today" value={counts.today} />
          <SummaryCard label="Completed" value={counts.completed} />
        </aside>
      </div>
    </div>
  );
}

const todoFilters: Array<{ value: TodoFilter; label: string }> = [
  { value: "open", label: "Open" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

function TodoRow({
  todo,
  onComplete,
  onDelete,
  onUpdate,
}: {
  todo: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
}) {
  const completed = isTerminalTaskStatus(todo.status);

  return (
    <div className="grid gap-3 p-4 transition hover:bg-[var(--surface-hover)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={() => onComplete(todo.id)}
          disabled={completed}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
            completed
              ? "border-[var(--success)] bg-[var(--success)] text-white"
              : "border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-soft)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          }`}
          aria-label={`Complete ${todo.title}`}
        >
          {completed ? <Check size={16} /> : <Circle size={15} />}
        </button>
        <div className="min-w-0">
          <input
            value={todo.title}
            onChange={(event) => onUpdate(todo.id, { title: event.target.value })}
            className={`w-full min-w-0 bg-transparent text-base font-bold text-[var(--text)] outline-none ${completed ? "line-through opacity-60" : ""}`}
            aria-label="Todo title"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {todo.dueDate ? (
              <Badge tone={taskDateTone(todo)}>
                <CalendarDays size={12} />
                {dateLabel(todo.dueDate, todo.dueTime)}
              </Badge>
            ) : null}
            {isOverdue(todo.dueDate) && !completed ? <Badge tone="red">Overdue</Badge> : null}
            <Badge tone={priorityTone(todo.priority)}>{getTaskPriorityOption(todo.priority).label}</Badge>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(todo.id)}
        className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]"
        aria-label={`Delete ${todo.title}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--shadow-sm)]">
      <div className="border-l-4 border-[var(--brand-primary)] pl-3">
        <p className="text-sm font-bold text-[var(--text-muted)]">{label}</p>
        <p className="mt-2 text-3xl font-black text-[var(--text)]">{value}</p>
      </div>
    </div>
  );
}
