import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { Project, ProjectInput } from "../../types/project";

const blank: ProjectInput = {
  name: "",
  description: "",
  status: "active",
  priority: "medium",
  dueDate: "",
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
        onSubmit({ ...form, name: form.name.trim(), dueDate: form.dueDate || undefined });
        if (!initialProject) setForm(blank);
      }}
    >
      <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Project name" required />
      <Input value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Description" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </Select>
        <Select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
        <Input type="date" value={form.dueDate ?? ""} onChange={(event) => update("dueDate", event.target.value)} />
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
