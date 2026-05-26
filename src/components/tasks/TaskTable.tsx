import { Check, Trash2 } from "lucide-react";
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  getTaskPriorityOption,
  getTaskRecurrenceOption,
  getTaskReminderOption,
  getTaskStatusOption,
  isKnownTaskPriority,
  isKnownTaskStatus,
  isTerminalTaskStatus,
  taskCategoryOptions,
  taskPriorityOptions,
  taskRecurrenceOptions,
  taskReminderOptions,
  taskStatusOptions,
} from "../../config/taskOptions";
import type { Project } from "../../types/project";
import type { Task, TaskCategory, TaskInput } from "../../types/task";
import type { AssigneeOption } from "../../types/collaboration";
import { dateLabel, durationLabel, startDateLabel } from "../../utils/date";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { OptionBadge } from "../ui/OptionBadge";
import { Select } from "../ui/Select";
import { mergeProjectTaskFields, type ProjectTaskFieldVisibility } from "../projects/projectTaskFields";

export function TaskTable({
  tasks,
  projects,
  onUpdate,
  onDelete,
  onComplete,
  lockedProjectId,
  assigneeOptions = [],
  visibleFields,
}: {
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  lockedProjectId?: string;
  assigneeOptions?: AssigneeOption[];
  visibleFields?: Partial<ProjectTaskFieldVisibility>;
}) {
  const fields = mergeProjectTaskFields("table", visibleFields);
  const minWidth =
    340 +
    (fields.project ? 230 : 0) +
    (fields.assignee ? 210 : 0) +
    (fields.priority ? 170 : 0) +
    (fields.status ? 190 : 0) +
    (fields.start ? 300 : 0) +
    (fields.due ? 300 : 0) +
    (visibleFields ? 0 : 380) +
    (fields.actions ? 130 : 0);

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm" style={{ minWidth }}>
          <thead className="bg-[var(--surface-raised)] text-xs font-bold text-[var(--text-soft)]">
            <tr>
              <th className="w-[340px] px-4 py-3">Task</th>
              {fields.project ? <th className="w-[230px] px-4 py-3">Project / Category</th> : null}
              {fields.assignee ? <th className="w-[210px] px-4 py-3">Assignee</th> : null}
              {fields.priority ? <th className="w-[170px] px-4 py-3">Priority</th> : null}
              {fields.status ? <th className="w-[190px] px-4 py-3">Status</th> : null}
              {fields.start ? <th className="w-[300px] px-4 py-3">Start</th> : null}
              {fields.due ? <th className="w-[300px] px-4 py-3">Due</th> : null}
              {!visibleFields ? <th className="w-[190px] px-4 py-3">Reminder</th> : null}
              {!visibleFields ? <th className="w-[190px] px-4 py-3">Repeats</th> : null}
              {fields.actions ? <th className="w-[130px] px-4 py-3 text-right">Actions</th> : null}
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
                assigneeOptions={assigneeOptions}
                fields={fields}
                showReminderRepeat={!visibleFields}
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
  assigneeOptions,
  fields,
  showReminderRepeat,
}: {
  task: Task;
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  lockedProjectId?: string;
  assigneeOptions: AssigneeOption[];
  fields: ProjectTaskFieldVisibility;
  showReminderRepeat: boolean;
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
    <tr className="group border-t border-[var(--border)] align-top transition hover:bg-[var(--surface-hover)]">
      <td className="px-4 py-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={handleTitleKeyDown}
          className={`align-field-quiet min-h-10 ${isTerminalTaskStatus(task.status) ? "line-through opacity-70" : ""}`}
        />
        {fields.notes && task.description ? <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{task.description}</p> : null}
      </td>
      {fields.project ? <td className="px-4 py-3">
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
            className="align-field-quiet min-h-10"
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
      </td> : null}
      {fields.assignee ? (
        <td className="px-4 py-3">
          <Select
            value={task.assigneeEmail ?? ""}
            onChange={(event) => {
              const option = assigneeOptions.find((item) => item.email === event.target.value);
              onUpdate(task.id, {
                assigneeEmail: option?.email ?? "",
                assigneeUserId: option?.userId ?? "",
                assignedAt: option?.email ? new Date().toISOString() : "",
              });
            }}
            className="align-field-quiet min-h-10"
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((option) => (
              <option key={`${option.email}-${option.userId ?? "email"}`} value={option.email}>
                {option.label}
              </option>
            ))}
          </Select>
        </td>
      ) : null}
      {fields.priority ? <td className="px-4 py-3">
        <Select
          value={task.priority}
          onChange={(event) => onUpdate(task.id, { priority: event.target.value as Task["priority"] })}
          className="min-h-10 font-bold"
          style={optionSelectStyle(priorityOption)}
        >
          {!isKnownTaskPriority(task.priority) ? <option value={task.priority}>{priorityOption.label}</option> : null}
          {taskPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </td> : null}
      {fields.status ? <td className="px-4 py-3">
        <Select
          value={task.status}
          onChange={(event) => onUpdate(task.id, { status: event.target.value as Task["status"] })}
          className="min-h-10 font-bold"
          style={optionSelectStyle(statusOption)}
        >
          {!isKnownTaskStatus(task.status) ? <option value={task.status}>{statusOption.label}</option> : null}
          {taskStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </td> : null}
      {fields.start ? <td className="px-4 py-3">
        <div className="grid grid-cols-[1fr_112px] gap-2">
          <Input
            type="date"
            value={task.startDate ?? ""}
            onChange={(event) => onUpdate(task.id, { startDate: event.target.value || undefined, startTime: event.target.value ? task.startTime : undefined })}
            className="align-field-quiet min-h-10"
            aria-label="Start date"
          />
          <Input
            type="time"
            value={task.startTime ?? ""}
            onChange={(event) => onUpdate(task.id, { startTime: event.target.value || undefined })}
            className="align-field-quiet min-h-10"
            aria-label="Start time"
          />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">{startDateLabel(task.startDate, task.startTime)}</p>
      </td> : null}
      {fields.due ? <td className="px-4 py-3">
        <div className="grid grid-cols-[1fr_112px] gap-2">
          <Input
            type="date"
            value={task.dueDate ?? ""}
            onChange={(event) => onUpdate(task.id, { dueDate: event.target.value || undefined, dueTime: event.target.value ? task.dueTime : undefined })}
            className="align-field-quiet min-h-10"
            aria-label="Due date"
          />
          <Input
            type="time"
            value={task.dueTime ?? ""}
            onChange={(event) => onUpdate(task.id, { dueTime: event.target.value || undefined })}
            className="align-field-quiet min-h-10"
            aria-label="Due time"
          />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">{dateLabel(task.dueDate, task.dueTime)}</p>
        {task.startDate ? <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">{durationLabel(task.startDate, task.dueDate)}</p> : null}
      </td> : null}
      {showReminderRepeat ? <td className="px-4 py-3">
        <Select
          value={task.reminder ?? "none"}
          onChange={(event) => onUpdate(task.id, { reminder: event.target.value as Task["reminder"] })}
          className="align-field-quiet min-h-10 min-w-[170px]"
          title={getTaskReminderOption(task.reminder).label}
        >
          {taskReminderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </td> : null}
      {showReminderRepeat ? <td className="px-4 py-3">
        <Select
          value={task.recurrence ?? "none"}
          onChange={(event) => onUpdate(task.id, { recurrence: event.target.value as Task["recurrence"] })}
          className="align-field-quiet min-h-10 min-w-[170px]"
          title={getTaskRecurrenceOption(task.recurrence).label}
        >
          {taskRecurrenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </td> : null}
      {fields.actions ? <td className="px-4 py-3">
        <div className="flex justify-end gap-2 opacity-75 transition group-hover:opacity-100">
          <Button title="Mark done" variant="secondary" className="px-3" onClick={() => onComplete(task.id)} disabled={isTerminalTaskStatus(task.status)}>
            <Check size={16} />
          </Button>
          <Button title="Delete task" variant="danger" className="px-3" onClick={() => onDelete(task.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </td> : null}
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
