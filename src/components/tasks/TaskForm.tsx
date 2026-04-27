import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { Task, TaskInput } from "../../types/task";
import type { Project } from "../../types/project";

const blank: TaskInput = {
  title: "",
  description: "",
  category: "personal",
  priority: "medium",
  status: "not-started",
  dueDate: "",
  projectId: "",
};

export function TaskForm({
  projects,
  initialTask,
  onSubmit,
  onCancel,
  compact = false,
}: {
  projects: Project[];
  initialTask?: Task;
  onSubmit: (input: TaskInput) => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [form, setForm] = useState<TaskInput>(initialTask ?? blank);

  const update = (key: keyof TaskInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className={compact ? "grid gap-3 lg:grid-cols-[1.5fr_1fr_0.8fr_0.9fr_0.95fr_auto]" : "grid gap-3"}
      onSubmit={(event) => {
        event.preventDefault();
        if (!form.title.trim()) return;
        onSubmit({ ...form, title: form.title.trim(), projectId: form.projectId || undefined, dueDate: form.dueDate || undefined });
        if (!initialTask) setForm(blank);
      }}
    >
      <Input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Add a task, goal, or personal chore" required />
      {!compact ? (
        <Input value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Short description" />
      ) : null}
      <Select value={form.projectId ?? ""} onChange={(event) => update("projectId", event.target.value)}>
        <option value="">Personal Task</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      <Select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </Select>
      <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
        <option value="not-started">Not Started</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </Select>
      <Input type="date" value={form.dueDate ?? ""} onChange={(event) => update("dueDate", event.target.value)} />
      <div className="flex gap-2">
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
