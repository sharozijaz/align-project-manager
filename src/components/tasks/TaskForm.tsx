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

  return (
    <form
      className={compact ? "grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-[1.4fr_1fr_0.75fr_0.85fr_1.15fr_1.15fr_0.95fr_0.95fr_auto]" : "grid gap-3"}
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
      <Input className={compact ? "col-span-2 lg:col-span-1" : ""} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Add a task, goal, or personal chore" required />
      {!compact ? (
        <Input value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Short description" />
      ) : null}
      {lockedProject ? (
        <div className={`flex min-h-10 min-w-0 items-center rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 ${compact ? "col-span-2 sm:col-span-1" : ""}`}>
          <Badge tone="blue">
            <span className="max-w-full truncate">{lockedProject.name}</span>
          </Badge>
        </div>
      ) : (
        <Select className={compact ? "col-span-2 sm:col-span-1" : ""} value={form.projectId ?? ""} onChange={(event) => update("projectId", event.target.value)}>
          <option value="">Personal Task</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      )}
      <Select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
        {!isKnownTaskPriority(form.priority) ? <option value={form.priority}>{getTaskPriorityOption(form.priority).label}</option> : null}
        {taskPriorityOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
        {!isKnownTaskStatus(form.status) ? <option value={form.status}>{getTaskStatusOption(form.status).label}</option> : null}
        {taskStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <DateTimeField
        label="Start"
        date={form.startDate}
        time={form.startTime}
        onDateChange={(value) => update("startDate", value)}
        onTimeChange={(value) => update("startTime", value)}
      />
      <DateTimeField
        label="Due"
        date={form.dueDate}
        time={form.dueTime}
        onDateChange={(value) => update("dueDate", value)}
        onTimeChange={(value) => update("dueTime", value)}
      />
      <Select value={form.reminder} onChange={(event) => update("reminder", event.target.value)}>
        {taskReminderOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Select value={form.recurrence} onChange={(event) => update("recurrence", event.target.value)}>
        {taskRecurrenceOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <div className={compact ? "col-span-2 flex gap-2 lg:col-span-1" : "flex gap-2"}>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">{initialTask ? "Save" : "Add"}</Button>
      </div>
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
      <div className="grid grid-cols-[1fr_92px] gap-2">
        <Input type="date" value={date ?? ""} onChange={(event) => onDateChange(event.target.value)} aria-label={`${label} date`} />
        <Input type="time" value={time ?? ""} onChange={(event) => onTimeChange(event.target.value)} aria-label={`${label} time`} />
      </div>
    </label>
  );
}
