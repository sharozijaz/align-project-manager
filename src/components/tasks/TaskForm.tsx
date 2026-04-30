import { useState } from "react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import {
  getTaskPriorityOption,
  getTaskStatusOption,
  isKnownTaskPriority,
  isKnownTaskStatus,
  taskReminderOptions,
  taskPriorityOptions,
  taskRecurrenceOptions,
  taskStatusOptions,
} from "../../config/taskOptions";
import type { Task, TaskInput } from "../../types/task";
import type { Project } from "../../types/project";

const blank: TaskInput = {
  title: "",
  description: "",
  category: "personal",
  priority: "medium",
  status: "not-started",
  startDate: "",
  startTime: "",
  dueDate: "",
  dueTime: "",
  reminder: "none",
  recurrence: "none",
  projectId: "",
};

export function TaskForm({
  projects,
  initialTask,
  onSubmit,
  onCancel,
  compact = false,
  lockedProject,
}: {
  projects: Project[];
  initialTask?: Task;
  onSubmit: (input: TaskInput) => void;
  onCancel?: () => void;
  compact?: boolean;
  lockedProject?: Project;
}) {
  const [form, setForm] = useState<TaskInput>({
    ...blank,
    ...initialTask,
    projectId: lockedProject?.id ?? initialTask?.projectId ?? "",
    reminder: initialTask?.reminder ?? "none",
    recurrence: initialTask?.recurrence ?? "none",
  });

  const update = (key: keyof TaskInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const titleField = (
    <Input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Add a task, goal, or personal chore" required />
  );

  const descriptionField = <Input value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Short description" />;

  const projectField = lockedProject ? (
    <div className="flex min-h-10 min-w-0 items-center rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3">
      <Badge tone="blue">
        <span className="max-w-full truncate">{lockedProject.name}</span>
      </Badge>
    </div>
  ) : (
    <Select value={form.projectId ?? ""} onChange={(event) => update("projectId", event.target.value)} aria-label="Project or category">
      <option value="">Personal Task</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </Select>
  );

  const priorityField = (
    <Select value={form.priority} onChange={(event) => update("priority", event.target.value)} aria-label="Priority">
      {!isKnownTaskPriority(form.priority) ? <option value={form.priority}>{getTaskPriorityOption(form.priority).label}</option> : null}
      {taskPriorityOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );

  const statusField = (
    <Select value={form.status} onChange={(event) => update("status", event.target.value)} aria-label="Status">
      {!isKnownTaskStatus(form.status) ? <option value={form.status}>{getTaskStatusOption(form.status).label}</option> : null}
      {taskStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );

  const startField = (
    <DateTimeField
      label="Start"
      date={form.startDate}
      time={form.startTime}
      onDateChange={(value) => update("startDate", value)}
      onTimeChange={(value) => update("startTime", value)}
    />
  );

  const dueField = (
    <DateTimeField
      label="Due"
      date={form.dueDate}
      time={form.dueTime}
      onDateChange={(value) => update("dueDate", value)}
      onTimeChange={(value) => update("dueTime", value)}
    />
  );

  const reminderField = (
    <Select value={form.reminder} onChange={(event) => update("reminder", event.target.value)} aria-label="Reminder">
      {taskReminderOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );

  const recurrenceField = (
    <Select value={form.recurrence} onChange={(event) => update("recurrence", event.target.value)} aria-label="Repeat">
      {taskRecurrenceOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );

  const actionButtons = (
    <div className={compact ? "flex items-end gap-2" : "flex gap-2"}>
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
      <Button type="submit" className={compact ? "min-h-10" : ""}>
        {initialTask ? "Save" : compact ? "Add Task" : "Add"}
      </Button>
    </div>
  );

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!form.title.trim()) return;
        onSubmit({
          ...form,
          title: form.title.trim(),
          projectId: lockedProject?.id ?? (form.projectId || undefined),
          category: lockedProject ? "project" : form.category,
          startDate: form.startDate || undefined,
          startTime: form.startDate && form.startTime ? form.startTime : undefined,
          dueDate: form.dueDate || undefined,
          dueTime: form.dueDate && form.dueTime ? form.dueTime : undefined,
        });
        if (!initialTask) setForm(lockedProject ? { ...blank, projectId: lockedProject.id, category: "project" } : blank);
      }}
    >
      {compact ? (
        <>
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_minmax(190px,240px)_minmax(140px,170px)_minmax(160px,190px)_auto]">
            {titleField}
            {projectField}
            {priorityField}
            {statusField}
            {actionButtons}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_minmax(280px,1fr)_minmax(190px,220px)_minmax(190px,220px)]">
            {startField}
            {dueField}
            {reminderField}
            {recurrenceField}
          </div>
        </>
      ) : (
        <>
          {titleField}
          {descriptionField}
          {projectField}
          <div className="grid gap-3 sm:grid-cols-2">
            {priorityField}
            {statusField}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {startField}
            {dueField}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {reminderField}
            {recurrenceField}
          </div>
          {actionButtons}
        </>
      )}
    </form>
  );
}

function DateTimeField({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  label: string;
  date?: string;
  time?: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">
      <span>{label}</span>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_112px]">
        <Input className="min-w-0" type="date" value={date ?? ""} onChange={(event) => onDateChange(event.target.value)} aria-label={`${label} date`} />
        <Input className="min-w-0" type="time" value={time ?? ""} onChange={(event) => onTimeChange(event.target.value)} aria-label={`${label} time`} />
      </div>
    </label>
  );
}
