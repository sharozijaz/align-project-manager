import { Archive, CheckCircle2, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
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
import { getClampedDragPreviewPosition } from "../utils/dragPreview";

type ProjectAreaFilter = "all" | ProjectArea;
type ProjectLifecycleFilter = Extract<ProjectStatus, "active" | "paused" | "completed" | "archived">;
type ProjectSort = "manual" | "updated" | "name" | "due";
type ProjectDragState = { id: string; startX: number; startY: number; x: number; y: number; active: boolean };

export function Projects() {
  const [creating, setCreating] = useState(false);
  const [areaFilter, setAreaFilter] = useState<ProjectAreaFilter>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<ProjectLifecycleFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<ProjectSort>("manual");
  const [completingProject, setCompletingProject] = useState<Project | null>(null);
  const [projectDrag, setProjectDrag] = useState<ProjectDragState | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const projectDragRef = useRef<ProjectDragState | null>(null);
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
  const draggedProjectId = projectDrag?.id ?? null;
  const draggedProject = draggedProjectId ? visibleProjects.find((project) => project.id === draggedProjectId) : undefined;
  const lifecycleLabel =
    lifecycleFilter === "active" ? "active" : lifecycleFilter === "paused" ? "paused" : lifecycleFilter === "completed" ? "completed" : "archived";

  useEffect(() => {
    projectDragRef.current = projectDrag;
  }, [projectDrag]);

  useEffect(() => {
    if (!projectDrag || sortMode !== "manual") return;

    const handlePointerMove = (event: PointerEvent) => {
      setProjectDrag((current) => {
        if (!current) return current;
        const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
        const active = current.active || distance > 8;

        if (active) {
          const target = getProjectDropTarget(event.clientX, event.clientY, current.id);
          setDragOverProjectId(target);
        }

        return { ...current, x: event.clientX, y: event.clientY, active };
      });
    };

    const handlePointerUp = () => {
      const current = projectDragRef.current;

      if (current?.active && dragOverProjectId && current.id !== dragOverProjectId) {
        const reorderedLiveIds = mergeVisibleOrder(
          liveProjects,
          visibleProjects,
          swapProjectSlots(visibleProjects.map((item) => item.id), current.id, dragOverProjectId),
        );
        const deletedProjectIds = projects.filter((item) => item.deletedAt).map((item) => item.id);
        reorderProjects([...reorderedLiveIds, ...deletedProjectIds]);
      }

      setProjectDrag(null);
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
  }, [dragOverProjectId, liveProjects, projectDrag, projects, reorderProjects, sortMode, visibleProjects]);

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
      <div className="align-toolbar">
        <div className="grid w-full gap-2 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,240px)_minmax(220px,240px)_minmax(210px,230px)]">
          <label className="relative block">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects..."
              className="align-field-quiet pl-10 sm:min-h-10"
            />
          </label>
          <Select className="align-field-quiet sm:min-h-10" value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value as ProjectLifecycleFilter)} aria-label="Project status">
            <option value="active">Status: Active ({activeCount})</option>
            <option value="paused">Status: Paused ({pausedCount})</option>
            <option value="completed">Status: Completed ({completedCount})</option>
            <option value="archived">Status: Archived ({archivedCount})</option>
          </Select>
          <Select className="align-field-quiet sm:min-h-10" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value as ProjectAreaFilter)} aria-label="Project category">
            <option value="all">Category: All ({lifecycleProjects.length})</option>
            <option value="business">Category: Business ({businessCount})</option>
            <option value="personal">Category: Personal ({personalCount})</option>
          </Select>
          <Select className="align-field-quiet sm:min-h-10" value={sortMode} onChange={(event) => setSortMode(event.target.value as ProjectSort)} aria-label="Project sort">
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
      <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:gap-7">
        {visibleProjects.map((project) => (
          <div
            key={project.id}
            data-project-reorder-id={project.id}
            onPointerDown={(event) => {
              if (sortMode !== "manual" || event.button !== 0 || isInteractiveDragTarget(event.target)) return;
              event.preventDefault();
              setProjectDrag({ id: project.id, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false });
            }}
            className={`relative min-w-0 rounded-[var(--radius-md)] transition-[opacity,transform] duration-150 ${
              sortMode === "manual" ? "cursor-grab active:cursor-grabbing" : ""
            } ${projectDrag?.active && draggedProjectId === project.id ? "scale-[0.99] opacity-40" : ""}`}
          >
            {projectDrag?.active && dragOverProjectId === project.id && draggedProjectId !== project.id ? <DropCue /> : null}
            <ProjectCard
              project={project}
              tasks={tasks.filter((task) => !task.deletedAt)}
              dragging={projectDrag?.active && draggedProjectId === project.id}
              dropTarget={projectDrag?.active && dragOverProjectId === project.id}
              canDrag={sortMode === "manual"}
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
        ))}
      </div>
      {projectDrag?.active && draggedProject ? <ProjectDragPreview project={draggedProject} x={projectDrag.x} y={projectDrag.y} /> : null}
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

function swapProjectSlots(ids: string[], draggedId: string, targetId: string) {
  const draggedIndex = ids.indexOf(draggedId);
  const targetIndex = ids.indexOf(targetId);
  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return ids;

  const next = [...ids];
  next[draggedIndex] = targetId;
  next[targetIndex] = draggedId;
  return next;
}

function mergeVisibleOrder(allProjects: { id: string }[], visibleProjects: { id: string }[], reorderedVisibleIds: string[]) {
  const visibleSlots = new Set(visibleProjects.map((project) => project.id));
  const nextVisible = [...reorderedVisibleIds];

  return allProjects.map((project) => (visibleSlots.has(project.id) ? nextVisible.shift() ?? project.id : project.id));
}

function getProjectDropTarget(clientX: number, clientY: number, draggedProjectId: string) {
  const element = document.elementFromPoint(clientX, clientY);
  const directTarget = element?.closest<HTMLElement>("[data-project-reorder-id]");
  const targetId = directTarget?.dataset.projectReorderId;
  return targetId && targetId !== draggedProjectId ? targetId : null;
}

function isInteractiveDragTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a, button, input, select, textarea, [role='button']"));
}

function DropCue() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--brand-primary)] bg-[var(--brand-50)]/55 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)]"
      initial={{ opacity: 0, scaleX: 0.96 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0.96 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
    />
  );
}

function ProjectDragPreview({ project, x, y }: { project: Project; x: number; y: number }) {
  const position = getClampedDragPreviewPosition(x, y, 520, 120);

  return (
    <motion.div
      className="pointer-events-none fixed z-50 w-[min(520px,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-[var(--brand-primary)] bg-[var(--surface)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.36)]"
      style={position}
      initial={{ opacity: 0, scale: 0.96, rotate: -1 }}
      animate={{ opacity: 0.94, scale: 1, rotate: -1.2 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
    >
      <div className="text-sm font-black text-[var(--text)]">{project.name}</div>
      <div className="mt-1 text-xs font-medium text-[var(--text-muted)]">{project.description || "No description yet."}</div>
    </motion.div>
  );
}
