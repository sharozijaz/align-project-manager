import { Archive, CheckCircle2, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ClientProjectsSharePanel } from "../components/projects/ClientProjectsSharePanel";
import { ProjectCard } from "../components/projects/ProjectCard";
import { ProjectForm } from "../components/projects/ProjectForm";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { Modal } from "../components/ui/Modal";
import { ScopedSearchNotice } from "../components/ui/ScopedSearchNotice";
import { Select } from "../components/ui/Select";
import { useProjectStore } from "../store/projectStore";
import { useMilestoneStore } from "../store/milestoneStore";
import { useSearchStore } from "../store/searchStore";
import { useStudioStore } from "../store/studioStore";
import { useTaskStore } from "../store/taskStore";
import type { Project, ProjectArea, ProjectStatus } from "../types/project";
import type { HubNote, HubPalette } from "../types/studio";
import type { TaskInput } from "../types/task";
import { getClampedDragPreviewPosition, getDragPreviewAnchor } from "../utils/dragPreview";
import { projectTemplates, type ProjectTemplate } from "../utils/projectTemplates";

type ProjectAreaFilter = "all" | ProjectArea;
type ProjectLifecycleFilter = Extract<ProjectStatus, "active" | "paused" | "completed" | "archived">;
type ProjectSort = "manual" | "updated" | "name" | "due";
type ProjectDragState = {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  previewOffsetX: number;
  previewOffsetY: number;
  active: boolean;
};

export function Projects() {
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [areaFilter, setAreaFilter] = useState<ProjectAreaFilter>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<ProjectLifecycleFilter>("active");
  const searchQuery = useSearchStore((state) => state.query);
  const clearSearchQuery = useSearchStore((state) => state.clearQuery);
  const [sortMode, setSortMode] = useState<ProjectSort>("manual");
  const [completingProject, setCompletingProject] = useState<Project | null>(null);
  const [projectDrag, setProjectDrag] = useState<ProjectDragState | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const projectDragRef = useRef<ProjectDragState | null>(null);
  const { projects, addProject, updateProject, deleteProject, reorderProjects, completeProject, archiveProject, restoreProject } = useProjectStore();
  const { tasks, addTask } = useTaskStore();
  const addMilestone = useMilestoneStore((state) => state.addMilestone);
  const addNote = useStudioStore((state) => state.addNote);
  const addPalette = useStudioStore((state) => state.addPalette);
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
      <section className="rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 border-l-4 border-[var(--brand-primary)] pl-4">
            <h1 className="text-2xl font-bold tracking-normal text-[var(--text)] sm:text-3xl">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--text-muted)]">
              Manage active, paused, completed, archived, and shared client projects.
            </p>
          </div>

          <Button className="w-full sm:w-auto" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            New Project
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4 xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-semibold text-[var(--text-muted)]">
              Showing <span className="font-bold text-[var(--brand-primary)]">{visibleProjects.length}</span> {lifecycleLabel}
            </span>
            {lifecycleFilter !== "archived" ? <ClientProjectsSharePanel embedded projects={shareableProjects} /> : null}
          </div>

          <div className="grid w-full gap-2 md:grid-cols-3 xl:ml-auto xl:w-auto xl:grid-cols-[minmax(200px,220px)_minmax(200px,220px)_minmax(190px,210px)]">
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
      </section>
      <ScopedSearchNotice query={searchQuery} scope="projects" resultCount={visibleProjects.length} onClear={clearSearchQuery} />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:gap-7">
        {visibleProjects.map((project) => (
          <div
            key={project.id}
            data-project-reorder-id={project.id}
            onPointerDown={(event) => {
              if (sortMode !== "manual" || event.button !== 0 || isInteractiveDragTarget(event.target)) return;
              event.preventDefault();
              const anchor = getDragPreviewAnchor(event.currentTarget, event.clientX, event.clientY, 520, 120);
              setProjectDrag({
                id: project.id,
                startX: event.clientX,
                startY: event.clientY,
                x: event.clientX,
                y: event.clientY,
                previewOffsetX: anchor.offsetX,
                previewOffsetY: anchor.offsetY,
                active: false,
              });
            }}
            className={`relative min-w-0 rounded-[var(--radius-md)] transition-[opacity,transform] duration-150 ${
              sortMode === "manual" ? "cursor-grab active:cursor-grabbing" : ""
            } ${projectDrag?.active && draggedProjectId === project.id ? "align-drag-source" : ""}`}
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
                void confirm({
                  title: "Archive project?",
                  description: `"${project?.name ?? "This project"}" will move out of the active workspace. You can restore it from Archived projects.`,
                  confirmLabel: "Archive",
                }).then((confirmed) => {
                  if (confirmed) archiveProject(projectId);
                });
              }}
              onRestore={restoreProject}
              onDelete={(projectId) => {
                const project = projects.find((item) => item.id === projectId);
                void confirm({
                  title: "Move project to Trash?",
                  description: `"${project?.name ?? "This project"}" will leave your project list, but you can restore it later from Trash.`,
                  confirmLabel: "Move to Trash",
                  tone: "danger",
                }).then((confirmed) => {
                  if (confirmed) deleteProject(projectId);
                });
              }}
            />
          </div>
        ))}
      </div>
      {projectDrag?.active && draggedProject ? <ProjectDragPreview project={draggedProject} x={projectDrag.x} y={projectDrag.y} offsetX={projectDrag.previewOffsetX} offsetY={projectDrag.previewOffsetY} /> : null}
      {!visibleProjects.length ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">
          {searchQuery.trim()
            ? "No projects match this search and filter combination."
            : liveProjects.length
              ? "No projects match these filters."
              : "Create your first project to start grouping tasks."}
        </div>
      ) : null}
      <Modal title="Create project" description="Define the project context, status, priority, and timeline." open={creating} onClose={() => setCreating(false)}>
        <ProjectTemplatePicker
          onApply={(template) => {
            applyProjectTemplate(template, { addProject, addTask, addNote, addPalette, addMilestone });
            setCreating(false);
          }}
        />
        <ProjectForm
          onSubmit={(input) => {
            addProject(input);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      </Modal>
      <Modal title="Mark project as completed?" description="Completed projects stay visible in history while open work is preserved." open={Boolean(completingProject)} onClose={() => setCompletingProject(null)}>
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
      className="align-drag-slot"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.7 }}
    />
  );
}

function ProjectTemplatePicker({ onApply }: { onApply: (template: ProjectTemplate) => void }) {
  return (
    <section className="mb-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Templates</p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">Projects are outcomes. Pick a starter workflow or create a blank project below.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {projectTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onApply(template)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            <span className="block font-bold text-[var(--text)]">{template.name}</span>
            <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--text-muted)]">{template.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function applyProjectTemplate(
  template: ProjectTemplate,
  actions: {
    addProject: (input: ProjectTemplate["project"]) => Project;
    addTask: (input: TaskInput) => void;
    addNote: (input: Omit<HubNote, "id" | "createdAt" | "updatedAt">) => HubNote;
    addPalette: (input: Omit<HubPalette, "id" | "createdAt" | "updatedAt">) => HubPalette;
    addMilestone: (input: { projectId: string; title: string; status: "planned" | "active" | "done"; sortOrder?: number; startDate?: string; dueDate?: string }) => { id: string; title: string };
  },
) {
  const project = actions.addProject(template.project);
  const milestones = new Map<string, string>();
  template.milestones.forEach((milestone) => {
    const created = actions.addMilestone({ ...milestone, projectId: project.id });
    milestones.set(created.title, created.id);
  });

  const notes = new Map<string, HubNote>();
  template.docs.forEach((doc) => {
    const milestoneId = doc.milestoneTitle ? milestones.get(doc.milestoneTitle) : undefined;
    const created = actions.addNote({
      ...doc,
      milestoneId,
      projectIds: [project.id],
      relatedNoteIds: [],
    });
    notes.set(created.title, created);
  });

  template.tasks.forEach(({ milestoneTitle, linkedDocTitle, ...task }) => {
    const linkedNote = linkedDocTitle ? notes.get(linkedDocTitle) : undefined;
    actions.addTask({
      ...task,
      projectId: project.id,
      milestoneId: milestoneTitle ? milestones.get(milestoneTitle) : undefined,
      linkedNoteIds: linkedNote ? [linkedNote.id] : [],
    });
  });

  if (template.palette) {
    const noteIds = (template.palette.noteTitles ?? []).map((title) => notes.get(title)?.id).filter((id): id is string => Boolean(id));
    actions.addPalette({
      ...template.palette,
      projectIds: [project.id],
      noteIds,
    });
  }
}

function ProjectDragPreview({ project, x, y, offsetX, offsetY }: { project: Project; x: number; y: number; offsetX: number; offsetY: number }) {
  const position = getClampedDragPreviewPosition(x, y, 520, 120, { offsetX, offsetY });

  return (
    <motion.div
      className="align-drag-preview w-[min(520px,calc(100vw-2rem))] p-4"
      style={position}
      initial={{ opacity: 0, scale: 0.94, rotate: -2.5, y: 8 }}
      animate={{ opacity: 0.96, scale: 1.02, rotate: -2.2, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, rotate: -1 }}
      transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.72 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] font-bold uppercase text-[var(--text-muted)]">
              {project.status}
            </span>
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-bold uppercase text-[var(--brand-primary)]">
              {project.priority}
            </span>
          </div>
          <div className="mt-3 truncate text-base font-bold text-[var(--text)]">{project.name}</div>
          <div className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[var(--text-muted)]">{project.description || "No description yet."}</div>
        </div>
        <span className="align-drag-handle shrink-0">⋯</span>
      </div>
    </motion.div>
  );
}
