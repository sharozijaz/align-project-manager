import { Archive, CheckCircle2, GripVertical, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { ClientProjectsSharePanel } from "../components/projects/ClientProjectsSharePanel";
import { ProjectCard } from "../components/projects/ProjectCard";
import { ProjectForm } from "../components/projects/ProjectForm";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import type { Project, ProjectArea, ProjectStatus } from "../types/project";

type ProjectAreaFilter = "all" | ProjectArea;
type ProjectLifecycleFilter = Extract<ProjectStatus, "active" | "paused" | "completed" | "archived">;
type ProjectSort = "manual" | "updated" | "name" | "due";

export function Projects() {
  const [creating, setCreating] = useState(false);
  const [areaFilter, setAreaFilter] = useState<ProjectAreaFilter>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<ProjectLifecycleFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<ProjectSort>("manual");
  const [completingProject, setCompletingProject] = useState<Project | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const { projects, addProject, updateProject, deleteProject, reorderProjects, completeProject, archiveProject, restoreProject } = useProjectStore();
  const { tasks } = useTaskStore();
  const liveProjects = useMemo(() => projects.filter((project) => !project.deletedAt), [projects]);
  const lifecycleProjects = useMemo(() => liveProjects.filter((project) => project.status === lifecycleFilter), [lifecycleFilter, liveProjects]);
  const shareableProjects = useMemo(() => liveProjects.filter((project) => project.status !== "archived"), [liveProjects]);
  const activeCount = liveProjects.filter((project) => project.status === "active").length;
  const pausedCount = liveProjects.filter((project) => project.status === "paused").length;
  const completedCount = liveProjects.filter((project) => project.status === "completed").length;
  const archivedCount = liveProjects.filter((project) => project.status === "archived").length;
  const businessCount = lifecycleProjects.filter((project) => (project.area ?? "business") === "business").length;
  const personalCount = lifecycleProjects.filter((project) => project.area === "personal").length;
  const search = searchQuery.trim().toLowerCase();
  const filteredProjects = useMemo(
    () =>
      (areaFilter === "all" ? lifecycleProjects : lifecycleProjects.filter((project) => (project.area ?? "business") === areaFilter)).filter((project) =>
        search ? `${project.name} ${project.description ?? ""}`.toLowerCase().includes(search) : true,
      ),
    [areaFilter, lifecycleProjects, search],
  );
  const visibleProjects = useMemo(
    () =>
      [...filteredProjects].sort((a, b) => {
        if (sortMode === "manual") return 0;
        if (sortMode === "name") return a.name.localeCompare(b.name);
        if (sortMode === "due") return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
    [filteredProjects, sortMode],
  );
  const lifecycleLabel =
    lifecycleFilter === "active" ? "active" : lifecycleFilter === "paused" ? "paused" : lifecycleFilter === "completed" ? "completed" : "archived";

  useEffect(() => {
    if (!draggedProjectId || sortMode !== "manual") return;

    const findTargetId = () => {
      const position = pointerPositionRef.current;
      if (!position) return null;
      const element = document.elementFromPoint(position.x, position.y);
      return element?.closest<HTMLElement>("[data-project-reorder-id]")?.dataset.projectReorderId ?? null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
      const targetId = findTargetId();
      setDragOverProjectId(targetId && targetId !== draggedProjectId ? targetId : null);
    };

    const handlePointerUp = () => {
      const targetId = findTargetId();
      if (targetId && targetId !== draggedProjectId) {
        const reorderedLiveIds = mergeVisibleOrder(
          liveProjects,
          visibleProjects,
          moveBefore(visibleProjects.map((item) => item.id), draggedProjectId, targetId),
        );
        const deletedProjectIds = projects.filter((item) => item.deletedAt).map((item) => item.id);
        reorderProjects([...reorderedLiveIds, ...deletedProjectIds]);
      }
      pointerPositionRef.current = null;
      setDraggedProjectId(null);
      setDragOverProjectId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggedProjectId, liveProjects, projects, reorderProjects, sortMode, visibleProjects]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Manage active, paused, completed, archived, and shared client projects."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            New Project
          </Button>
        }
      />
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.2fr)_180px_180px_210px]">
          <label className="relative block">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects..."
              className="pl-10"
            />
          </label>
          <Select value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value as ProjectLifecycleFilter)} aria-label="Project status">
            <option value="active">Status: Active ({activeCount})</option>
            <option value="paused">Status: Paused ({pausedCount})</option>
            <option value="completed">Status: Completed ({completedCount})</option>
            <option value="archived">Status: Archived ({archivedCount})</option>
          </Select>
          <Select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value as ProjectAreaFilter)} aria-label="Project category">
            <option value="all">Category: All ({lifecycleProjects.length})</option>
            <option value="business">Category: Business ({businessCount})</option>
            <option value="personal">Category: Personal ({personalCount})</option>
          </Select>
          <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as ProjectSort)} aria-label="Project sort">
            <option value="manual">Sort: Manual order</option>
            <option value="updated">Sort: Recently updated</option>
            <option value="name">Sort: Name</option>
            <option value="due">Sort: Due date</option>
          </Select>
        </div>
      </div>
      {lifecycleFilter !== "archived" ? <ClientProjectsSharePanel projects={shareableProjects} /> : null}
      <p className="text-sm font-medium text-[var(--text-muted)]">
        Showing <span className="font-bold text-[var(--brand-primary)]">{visibleProjects.length}</span> {lifecycleLabel} projects
      </p>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {visibleProjects.map((project) => (
          <div
            key={project.id}
            data-project-reorder-id={project.id}
            onDragOver={(event) => {
              if (draggedProjectId === project.id) return;
              event.preventDefault();
              setDragOverProjectId(project.id);
            }}
            onDragLeave={() => setDragOverProjectId((current) => (current === project.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggedProjectId || draggedProjectId === project.id) return;
              if (sortMode !== "manual") return;
              const reorderedLiveIds = mergeVisibleOrder(
                liveProjects,
                visibleProjects,
                moveBefore(visibleProjects.map((item) => item.id), draggedProjectId, project.id),
              );
              const deletedProjectIds = projects.filter((item) => item.deletedAt).map((item) => item.id);
              reorderProjects([...reorderedLiveIds, ...deletedProjectIds]);
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
              draggable={sortMode === "manual"}
              disabled={sortMode !== "manual"}
              title={sortMode === "manual" ? "Drag to reorder" : "Switch to manual order to drag"}
              aria-label="Drag to reorder project"
              onPointerDown={(event) => {
                if (sortMode !== "manual" || event.button !== 0) return;
                event.preventDefault();
                pointerPositionRef.current = { x: event.clientX, y: event.clientY };
                setDraggedProjectId(project.id);
              }}
              onDragStart={(event) => {
                if (sortMode !== "manual") return;
                setDraggedProjectId(project.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", project.id);
              }}
              className={`hidden w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-soft)] transition sm:flex ${
                sortMode === "manual" ? "cursor-grab hover:border-[var(--brand-primary)] hover:text-[var(--text)] active:cursor-grabbing" : "cursor-not-allowed opacity-40"
              }`}
            >
              <GripVertical size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <ProjectCard
                project={project}
                tasks={tasks.filter((task) => !task.deletedAt)}
                onUpdate={updateProject}
                onComplete={setCompletingProject}
                onArchive={(projectId) => {
                  const project = projects.find((item) => item.id === projectId);
                  if (window.confirm(`Archive "${project?.name ?? "this project"}"? It will move out of the active workspace.`)) {
                    archiveProject(projectId);
                  }
                }}
                onRestore={restoreProject}
                onDelete={(projectId) => {
                  const project = projects.find((item) => item.id === projectId);
                  if (window.confirm(`Move "${project?.name ?? "this project"}" to Trash? You can restore it later.`)) {
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
          {liveProjects.length ? "No projects match these filters." : "Create your first project to start grouping tasks."}
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
      <Modal title="Mark project as completed?" open={Boolean(completingProject)} onClose={() => setCompletingProject(null)}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Keep the project visible in Completed, or complete it and move it straight into Archive.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              icon={<CheckCircle2 size={16} />}
              onClick={() => {
                if (completingProject) completeProject(completingProject.id);
                setCompletingProject(null);
              }}
            >
              Mark Completed
            </Button>
            <Button
              variant="secondary"
              icon={<Archive size={16} />}
              onClick={() => {
                if (completingProject) completeProject(completingProject.id, true);
                setCompletingProject(null);
              }}
            >
              Mark Completed & Archive
            </Button>
            <Button variant="ghost" onClick={() => setCompletingProject(null)}>
              Cancel
            </Button>
          </div>
        </div>
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

function mergeVisibleOrder(allProjects: { id: string }[], visibleProjects: { id: string }[], reorderedVisibleIds: string[]) {
  const visibleSlots = new Set(visibleProjects.map((project) => project.id));
  const nextVisible = [...reorderedVisibleIds];

  return allProjects.map((project) => (visibleSlots.has(project.id) ? nextVisible.shift() ?? project.id : project.id));
}
