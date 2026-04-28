import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { ProjectForm } from "./ProjectForm";
import { isTerminalTaskStatus } from "../../config/taskOptions";
import { dateLabel } from "../../utils/date";
import type { Project, ProjectInput } from "../../types/project";
import type { Task } from "../../types/task";

export function ProjectCard({
  project,
  tasks,
  onUpdate,
  onDelete,
}: {
  project: Project;
  tasks: Task[];
  onUpdate: (id: string, input: Partial<ProjectInput>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const open = projectTasks.filter((task) => !isTerminalTaskStatus(task.status)).length;
  const complete = projectTasks.length - open;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to={`/projects/${project.id}`} className="text-lg font-bold text-slate-950 hover:underline">
            {project.name}
          </Link>
          <p className="mt-1 text-sm text-slate-500">{project.description || "No description yet."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-3" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </Button>
          <Button variant="danger" className="px-3" onClick={() => onDelete(project.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge tone={project.status === "completed" ? "emerald" : project.status === "paused" ? "amber" : "blue"}>{project.status}</Badge>
        <Badge>{dateLabel(project.dueDate)}</Badge>
        <Badge>{projectTasks.length} tasks</Badge>
        <Badge>{open} open</Badge>
        <Badge>{complete} done</Badge>
      </div>
      <Modal title="Edit project" open={editing} onClose={() => setEditing(false)}>
        <ProjectForm
          initialProject={project}
          onSubmit={(input) => {
            onUpdate(project.id, input);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </Card>
  );
}
