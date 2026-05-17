import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus, taskStatusOptions } from "../../config/taskOptions";
import type { Task, TaskInput, TaskStatus } from "../../types/task";
import { dateLabel } from "../../utils/date";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export function ProjectTaskKanban({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}: {
  tasks: Task[];
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
}) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const parentTasks = tasks.filter((task) => !task.parentTaskId);
  const subtasksByParent = new Map<string, Task[]>();
  tasks.forEach((task) => {
    if (!task.parentTaskId) return;
    subtasksByParent.set(task.parentTaskId, [...(subtasksByParent.get(task.parentTaskId) ?? []), task]);
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="grid min-w-[1680px] grid-cols-7 gap-4 2xl:min-w-0">
        {taskStatusOptions.map((status) => {
          const columnTasks = parentTasks.filter((task) => task.status === status.value);

          return (
            <section key={status.value} className="flex min-h-[560px] flex-col rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)]">
              <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-4">
                <span
                  className="rounded-full border px-2.5 py-1 text-xs font-bold"
                  style={{ backgroundColor: status.bg, borderColor: status.border, color: status.text }}
                >
                  {status.label}
                </span>
                <span className="text-xs font-bold text-[var(--text-soft)]">{columnTasks.length}</span>
              </header>
              <div
                className={`grid flex-1 content-start gap-4 rounded-b-[var(--radius-md)] p-4 transition ${
                  dragOverStatus === status.value ? "bg-[var(--brand-50)] shadow-[inset_0_0_0_2px_var(--brand-primary)]" : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverStatus(status.value);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverStatus(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedTaskId) onUpdateTask(draggedTaskId, { status: status.value });
                  setDraggedTaskId(null);
                  setDragOverStatus(null);
                }}
              >
                {columnTasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    subtaskCount={subtasksByParent.get(task.id)?.length ?? 0}
                    dragging={draggedTaskId === task.id}
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setDragOverStatus(null);
                    }}
                    onMove={(status) => onUpdateTask(task.id, { status })}
                    onDelete={() => onDeleteTask(task.id)}
                    onComplete={() => onCompleteTask(task.id)}
                  />
                ))}
                {!columnTasks.length ? (
                  <div
                    className={`rounded-[var(--radius-sm)] border border-dashed p-6 text-center text-xs transition ${
                      dragOverStatus === status.value
                        ? "border-[var(--brand-primary)] bg-[var(--brand-50)] text-[var(--text)]"
                        : "border-[var(--border)] bg-[var(--empty-bg)] text-[var(--text-soft)]"
                    }`}
                  >
                    {draggedTaskId ? "Drop task here" : "No tasks"}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KanbanTaskCard({
  task,
  subtaskCount,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onDelete,
  onComplete,
}: {
  task: Task;
  subtaskCount: number;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
  onComplete: () => void;
}) {
  const priority = getTaskPriorityOption(task.priority);
  const status = getTaskStatusOption(task.status);

  return (
    <Card
      className={`cursor-grab p-4 transition duration-200 active:cursor-grabbing ${
        dragging ? "rotate-2 scale-[1.03] border-[var(--brand-primary)] opacity-70 shadow-[var(--shadow-md)]" : "hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
      }`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-bold text-[var(--text)]">{task.title}</h3>
        {subtaskCount ? <Badge>{subtaskCount} sub</Badge> : null}
      </div>
      {task.description ? <p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--text-muted)]">{task.description}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded border px-2 py-1 text-xs font-bold" style={{ backgroundColor: priority.bg, borderColor: priority.border, color: priority.text }}>
          {priority.label}
        </span>
        <Badge>{dateLabel(task.dueDate, task.dueTime)}</Badge>
      </div>
      <div className="mt-4 grid gap-3">
        <select
          value={task.status}
          onChange={(event) => onMove(event.target.value as TaskStatus)}
          className="min-h-9 rounded-md border px-2 text-xs font-bold"
          style={{ backgroundColor: status.bg, borderColor: status.border, color: status.text }}
        >
          {taskStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button title="Mark done" variant="secondary" className="min-h-8 px-2" onClick={onComplete} disabled={isTerminalTaskStatus(task.status)}>
            <Check size={14} />
          </Button>
          <Button title="Delete" variant="danger" className="min-h-8 px-2" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
