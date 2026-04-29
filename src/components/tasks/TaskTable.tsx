import { Check, Trash2 } from "lucide-react";
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  getTaskPriorityOption,
  getTaskReminderOption,
  getTaskStatusOption,
  isKnownTaskPriority,
  isKnownTaskStatus,
  isTerminalTaskStatus,
  taskCategoryOptions,
  taskPriorityOptions,
  taskReminderOptions,
  taskStatusOptions,
} from "../../config/taskOptions";
import type { Project } from "../../types/project";
import type { Task, TaskCategory, TaskInput } from "../../types/task";
import { dateLabel } from "../../utils/date";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { OptionBadge } from "../ui/OptionBadge";
import { Select } from "../ui/Select";

export function TaskTable({
  tasks,
  projects,
  onUpdate,
  onDelete,
  onComplete,
  lockedProjectId,
}: {
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  lockedProjectId?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--surface-raised)] text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">
            <tr>
              <th className="w-[32%] px-4 py-3">Task</th>
              <th className="w-[20%] px-4 py-3">Project / Category</th>
              <th className="w-[14%] px-4 py-3">Priority</th>
              <th className="w-[15%] px-4 py-3">Status</th>
              <th className="w-[12%] px-4 py-3">Due Date</th>
              <th className="w-[12%] px-4 py-3">Reminder</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <TaskTableRow
                key={task.id}
                task={task}
                projects={projects}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onComplete={onComplete}
                lockedProjectId={lockedProjectId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskTableRow({
  task,
  projects,
  onUpdate,
  onDelete,
  onComplete,
  lockedProjectId,
}: {
  task: Task;
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  lockedProjectId?: string;
}) {
  const [title, setTitle] = useState(task.title);
  const priorityOption = getTaskPriorityOption(task.priority);
  const statusOption = getTaskStatusOption(task.status);
  const projectCategoryValue = task.projectId ? `project:${task.projectId}` : `category:${task.category}`;

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  const commitTitle = () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setTitle(task.title);
      return;
    }

    if (nextTitle !== task.title) {
      onUpdate(task.id, { title: nextTitle });
    }
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      setTitle(task.title);
      event.currentTarget.blur();
    }
  };

  return (
    <tr className="border-t border-[var(--border)] align-top transition hover:bg-[var(--surface-hover)]">
      <td className="px-4 py-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={handleTitleKeyDown}
          className={`min-h-10 ${isTerminalTaskStatus(task.status) ? "line-through opacity-70" : ""}`}
        />
        {task.description ? <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{task.description}</p> : null}
      </td>
      <td className="px-4 py-3">
        {lockedProjectId ? (
          <OptionBadge
            option={{
              value: "project",
              label: projects.find((project) => project.id === lockedProjectId)?.name ?? "Project",
              rank: 0,
              bg: "var(--tag-project-bg)",
              text: "var(--tag-project-fg)",
              border: "var(--border)",
            }}
          />
        ) : (
          <Select
            value={projectCategoryValue}
            onChange={(event) =>
              onUpdate(task.id, projectCategoryUpdate(event.target.value))
            }
            className="min-h-10"
          >
            {taskCategoryOptions.map((option) => (
              <option key={option.value} value={`category:${option.value}`}>
                {option.label}
              </option>
            ))}
            {projects.map((project) => (
              <option key={project.id} value={`project:${project.id}`}>
                {project.name}
              </option>
            ))}
          </Select>
        )}
      </td>
      <td className="px-4 py-3">
        <Select
          value={task.priority}
          onChange={(event) => onUpdate(task.id, { priority: event.target.value as Task["priority"] })}
          className="min-h-10"
          style={optionSelectStyle(priorityOption)}
        >
          {!isKnownTaskPriority(task.priority) ? <option value={task.priority}>{priorityOption.label}</option> : null}
          {taskPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={task.status}
          onChange={(event) => onUpdate(task.id, { status: event.target.value as Task["status"] })}
          className="min-h-10"
          style={optionSelectStyle(statusOption)}
        >
          {!isKnownTaskStatus(task.status) ? <option value={task.status}>{statusOption.label}</option> : null}
          {taskStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-4 py-3">
        <Input
          type="date"
          value={task.dueDate ?? ""}
          onChange={(event) => onUpdate(task.id, { dueDate: event.target.value || undefined })}
          className="min-h-10"
        />
        <p className="mt-2 text-xs text-[var(--text-muted)]">{dateLabel(task.dueDate)}</p>
      </td>
      <td className="px-4 py-3">
        <Select
          value={task.reminder ?? "none"}
          onChange={(event) => onUpdate(task.id, { reminder: event.target.value as Task["reminder"] })}
          className="min-h-10"
          title={getTaskReminderOption(task.reminder).label}
        >
          {taskReminderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button title="Mark done" variant="secondary" className="px-3" onClick={() => onComplete(task.id)} disabled={isTerminalTaskStatus(task.status)}>
            <Check size={16} />
          </Button>
          <Button title="Delete task" variant="danger" className="px-3" onClick={() => onDelete(task.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function projectCategoryUpdate(value: string): Partial<TaskInput> {
  if (value.startsWith("project:")) {
    return { projectId: value.replace("project:", ""), category: "project" };
  }

  return { projectId: undefined, category: value.replace("category:", "") as TaskCategory };
}

function optionSelectStyle(option: { bg: string; text: string; border: string }): CSSProperties {
  return {
    backgroundColor: option.bg,
    borderColor: option.border,
    color: option.text,
  };
}
