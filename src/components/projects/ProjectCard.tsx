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
    <Card className="overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 overflow-hidden">
          <Link to={`/projects/${project.id}`} className="break-words text-lg font-bold text-slate-950 hover:underline">
            {project.name}
          </Link>
          <p className="mt-1 text-sm text-slate-500">{project.description || "No description yet."}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" className="min-h-9 px-3 sm:min-h-10" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </Button>
          <Button variant="danger" className="min-h-9 px-3 sm:min-h-10" onClick={() => onDelete(project.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <div className="mt-5 flex min-w-0 flex-wrap gap-2">
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
