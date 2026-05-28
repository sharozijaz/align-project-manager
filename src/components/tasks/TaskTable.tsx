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
import { dateLabel, durationLabel, startDateLabel } from "../../utils/date";
import { Input } from "../ui/Input";
import { OptionBadge } from "../ui/OptionBadge";
import { Select } from "../ui/Select";
import { mergeProjectTaskFields, type ProjectTaskFieldVisibility } from "../projects/projectTaskFields";
import { TaskOverflowMenu } from "./TaskOverflowMenu";
import { TaskDateTimeField } from "./TaskDateTimeField";

export function TaskTable({
  tasks,
  projects,
  onUpdate,
  onDelete,
  onOpen,
  lockedProjectId,
  visibleFields,
}: {
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onOpen?: (task: Task) => void;
  lockedProjectId?: string;
  visibleFields?: Partial<ProjectTaskFieldVisibility>;
}) {
  const fields = mergeProjectTaskFields("table", visibleFields);
  const minWidth =
    340 +
    (fields.project ? 230 : 0) +
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
                onOpen={onOpen}
                lockedProjectId={lockedProjectId}
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
  onOpen,
  lockedProjectId,
  fields,
  showReminderRepeat,
}: {
  task: Task;
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onOpen?: (task: Task) => void;
  lockedProjectId?: string;
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
    <tr className="group border-t border-[var(--border)] align-top transition hover:bg-[var(--surface-hover)]" onDoubleClick={() => onOpen?.(task)}>
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
        <TaskDateTimeField
          label="Start"
          summary={startDateLabel(task.startDate, task.startTime)}
          date={task.startDate}
          time={task.startTime}
          onDateChange={(value) => onUpdate(task.id, { startDate: value || undefined, startTime: value ? task.startTime : undefined })}
          onTimeChange={(value) => onUpdate(task.id, { startTime: value || undefined })}
        />
      </td> : null}
      {fields.due ? <td className="px-4 py-3">
        <TaskDateTimeField
          label="Due"
          summary={dateLabel(task.dueDate, task.dueTime)}
          date={task.dueDate}
          time={task.dueTime}
          onDateChange={(value) => onUpdate(task.id, { dueDate: value || undefined, dueTime: value ? task.dueTime : undefined })}
          onTimeChange={(value) => onUpdate(task.id, { dueTime: value || undefined })}
        />
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
        <div className="flex justify-end opacity-75 transition group-hover:opacity-100">
          <TaskOverflowMenu task={task} onOpen={onOpen} onDelete={onDelete} />
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
