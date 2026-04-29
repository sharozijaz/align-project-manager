import { GripVertical, Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { ClientProjectsSharePanel } from "../components/projects/ClientProjectsSharePanel";
import { ProjectCard } from "../components/projects/ProjectCard";
import { ProjectForm } from "../components/projects/ProjectForm";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";

export function Projects() {
  const [creating, setCreating] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const { projects, addProject, updateProject, deleteProject, reorderProjects } = useProjectStore();
  const { tasks } = useTaskStore();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Group related tasks, track status, and keep active work easy to scan."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            New Project
          </Button>
        }
      />
      <ClientProjectsSharePanel projects={projects} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.id}
            onDragOver={(event) => {
              if (draggedProjectId === project.id) return;
              event.preventDefault();
              setDragOverProjectId(project.id);
            }}
            onDragLeave={() => setDragOverProjectId((current) => (current === project.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggedProjectId || draggedProjectId === project.id) return;
              reorderProjects(moveBefore(projects.map((item) => item.id), draggedProjectId, project.id));
              setDraggedProjectId(null);
              setDragOverProjectId(null);
            }}
            onDragEnd={() => {
              setDraggedProjectId(null);
              setDragOverProjectId(null);
            }}
            className={`flex min-w-0 gap-2 rounded-[var(--radius-md)] transition-all duration-200 ${draggedProjectId === project.id ? "scale-[0.99] opacity-45" : ""} ${dragOverProjectId === project.id ? "translate-y-1 border-t-2 border-[var(--brand-primary)] pt-2" : ""}`}
          >
            <button
              type="button"
              draggable
              title="Drag to reorder"
              aria-label="Drag to reorder project"
              onDragStart={(event) => {
                setDraggedProjectId(project.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              className="flex w-8 shrink-0 cursor-grab items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-soft)] transition hover:border-[var(--brand-primary)] hover:text-[var(--text)] active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <ProjectCard
                project={project}
                tasks={tasks.filter((task) => !task.deletedAt)}
                onUpdate={updateProject}
                onDelete={(projectId) => {
                  const project = projects.find((item) => item.id === projectId);
                  if (window.confirm(`Delete "${project?.name ?? "this project"}"? Tasks will stay in your workspace.`)) {
                    deleteProject(projectId);
                  }
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {!projects.length ? <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">Create your first project to start grouping tasks.</div> : null}
      <Modal title="Create project" open={creating} onClose={() => setCreating(false)}>
        <ProjectForm
          onSubmit={(input) => {
            addProject(input);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </div>
  );
}

function moveBefore(ids: string[], draggedId: string, targetId: string) {
  const next = ids.filter((id) => id !== draggedId);
  const targetIndex = next.indexOf(targetId);
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, draggedId);
  return next;
}
