import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { taskPriorityOptions } from "../../config/taskOptions";
import type { Project, ProjectInput } from "../../types/project";

const blank: ProjectInput = {
  name: "",
  description: "",
  status: "active",
  priority: "medium",
  startDate: "",
  startTime: "",
  dueDate: "",
  dueTime: "",
};

export function ProjectForm({
  initialProject,
  onSubmit,
  onCancel,
}: {
  initialProject?: Project;
  onSubmit: (input: ProjectInput) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ProjectInput>(initialProject ?? blank);
  const update = (key: keyof ProjectInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!form.name.trim()) return;
        onSubmit({
          ...form,
          name: form.name.trim(),
          startDate: form.startDate || undefined,
          startTime: form.startDate && form.startTime ? form.startTime : undefined,
          dueDate: form.dueDate || undefined,
          dueTime: form.dueDate && form.dueTime ? form.dueTime : undefined,
        });
        if (!initialProject) setForm(blank);
      }}
    >
      <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Project name" required />
      <Input value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Description" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </Select>
        <Select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
          {taskPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
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
      </div>
      <div className="flex gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">{initialProject ? "Save" : "Create Project"}</Button>
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
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_112px]">
        <Input className="min-w-0" type="date" value={date ?? ""} onChange={(event) => onDateChange(event.target.value)} aria-label={`${label} date`} />
        <Input className="min-w-0" type="time" value={time ?? ""} onChange={(event) => onTimeChange(event.target.value)} aria-label={`${label} time`} />
      </div>
    </label>
  );
}
