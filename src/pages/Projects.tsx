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
import type { ProjectArea } from "../types/project";

type ProjectAreaFilter = "all" | ProjectArea;

export function Projects() {
  const [creating, setCreating] = useState(false);
  const [areaFilter, setAreaFilter] = useState<ProjectAreaFilter>("all");
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const { projects, addProject, updateProject, deleteProject, reorderProjects } = useProjectStore();
  const { tasks } = useTaskStore();
  const businessCount = projects.filter((project) => (project.area ?? "business") === "business").length;
  const personalCount = projects.filter((project) => project.area === "personal").length;
  const visibleProjects = areaFilter === "all" ? projects : projects.filter((project) => (project.area ?? "business") === areaFilter);

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
      <div className="flex flex-wrap gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2">
        <ProjectAreaButton active={areaFilter === "all"} onClick={() => setAreaFilter("all")} label="All" count={projects.length} />
        <ProjectAreaButton active={areaFilter === "business"} onClick={() => setAreaFilter("business")} label="Business" count={businessCount} />
        <ProjectAreaButton active={areaFilter === "personal"} onClick={() => setAreaFilter("personal")} label="Personal" count={personalCount} />
      </div>
      <ClientProjectsSharePanel projects={visibleProjects} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {visibleProjects.map((project) => (
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
              reorderProjects(mergeVisibleOrder(projects, visibleProjects, moveBefore(visibleProjects.map((item) => item.id), draggedProjectId, project.id)));
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
      {!visibleProjects.length ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">
          {projects.length ? `No ${areaFilter} projects yet.` : "Create your first project to start grouping tasks."}
        </div>
      ) : null}
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

function ProjectAreaButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-bold transition ${
        active
          ? "bg-[var(--brand-primary)] text-white shadow-[var(--shadow-sm)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-[var(--badge-bg)] text-[var(--text-soft)]"}`}>{count}</span>
    </button>
  );
}

function moveBefore(ids: string[], draggedId: string, targetId: string) {
  const next = ids.filter((id) => id !== draggedId);
  const targetIndex = next.indexOf(targetId);
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, draggedId);
  return next;
}

function mergeVisibleOrder(allProjects: { id: string }[], visibleProjects: { id: string }[], reorderedVisibleIds: string[]) {
  const visibleSlots = new Set(visibleProjects.map((project) => project.id));
  const nextVisible = [...reorderedVisibleIds];

  return allProjects.map((project) => (visibleSlots.has(project.id) ? nextVisible.shift() ?? project.id : project.id));
}
