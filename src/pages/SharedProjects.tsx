import { Columns3, KanbanSquare, ListTree, Plus, RefreshCw, ShieldCheck, StickyNote, Table2, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { pullSharedProjects, subscribeToProjectTaskChanges, updateSharedTask, createSharedTask, deleteSharedTask, reorderSharedTasks, collaboratorAssigneeOptions } from "../integrations/supabase/collaboration";
import { useFeatureAccess } from "../features/access/FeatureAccessProvider";
import type { SharedProjectBundle } from "../integrations/supabase/collaboration";
import type { Project } from "../types/project";
import type { HubNote } from "../types/studio";
import type { Task, TaskInput } from "../types/task";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { TaskForm } from "../components/tasks/TaskForm";
import { TaskList } from "../components/tasks/TaskList";
import { NoteReaderModal } from "../components/notes/NoteReaderModal";
import { ProjectTaskBoard } from "../components/projects/ProjectTaskBoard";
import { ProjectTaskKanban } from "../components/projects/ProjectTaskKanban";
import type { ProjectTaskFieldVisibility } from "../components/projects/projectTaskFields";
import { startDateLabel, dateLabel } from "../utils/date";

type SharedView = "cards" | "table" | "board" | "kanban" | "notes";

export function SharedProjects() {
  const { access } = useFeatureAccess();
  const [bundle, setBundle] = useState<SharedProjectBundle>({ collaborators: [], projects: [], tasks: [], notes: [] });
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [view, setView] = useState<SharedView>("cards");
  const [addOpen, setAddOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const next = await pullSharedProjects();
      setBundle(next);
      setSelectedProjectId((current) => (current && next.projects.some((project) => project.id === current) ? current : next.projects[0]?.id ?? ""));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load shared projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const projectIds = bundle.projects.map((project) => project.id);
    if (!projectIds.length) return undefined;

    return subscribeToProjectTaskChanges(projectIds, (task, taskId) => {
      setBundle((current) => ({
        ...current,
        tasks: task ? upsertTask(current.tasks, task) : current.tasks.filter((item) => item.id !== taskId),
      }));
    });
  }, [bundle.projects]);

  const selectedProject = bundle.projects.find((project) => project.id === selectedProjectId);
  const selectedCollaborators = useMemo(() => bundle.collaborators.filter((collaborator) => collaborator.projectId === selectedProjectId), [bundle.collaborators, selectedProjectId]);
  const assigneeOptions = useMemo(() => collaboratorAssigneeOptions(selectedCollaborators), [selectedCollaborators]);
  const selectedProjectTasks = useMemo(() => {
    const email = access?.profile.email.toLowerCase();
    return bundle.tasks
      .filter((task) => task.projectId === selectedProjectId)
      .filter((task) => {
        if (filter === "mine") return Boolean(email && task.assigneeEmail?.toLowerCase() === email);
        if (filter === "unassigned") return !task.assigneeEmail;
        return true;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt));
  }, [access?.profile.email, bundle.tasks, filter, selectedProjectId]);

  const sharedNotes = bundle.notes.filter((note) => note.projectIds.includes(selectedProjectId));

  const updateTask = async (taskId: string, input: Partial<TaskInput>) => {
    try {
      const updated = await updateSharedTask(taskId, input);
      setBundle((current) => ({ ...current, tasks: upsertTask(current.tasks, updated) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update task.");
    }
  };

  const addTask = async (input: TaskInput) => {
    if (!selectedProject) return;
    try {
      const created = await createSharedTask(selectedProject.id, { ...input, projectId: selectedProject.id, category: "project" });
      setBundle((current) => ({ ...current, tasks: upsertTask(current.tasks, created) }));
      setAddOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create task.");
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      await deleteSharedTask(taskId);
      setBundle((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== taskId) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete task.");
    }
  };

  const completeTask = async (taskId: string) => updateTask(taskId, { status: "done" });

  const reorderTasks = async (orderedIds: string[]) => {
    setBundle((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        const index = orderedIds.indexOf(task.id);
        return index >= 0 ? { ...task, sortOrder: index } : task;
      }),
    }));
    try {
      await reorderSharedTasks(orderedIds);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save task order.");
      void load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Shared Projects</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Project-only workspaces shared with {access?.profile.email ?? "you"}.</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Focused collaborator view</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">You can update shared project tasks only. Private workspace data is not loaded here.</p>
            </div>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[460px]">
            <Select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} disabled={!bundle.projects.length}>
              {bundle.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
              <option value="all">All shared tasks</option>
              <option value="mine">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 lg:flex-row lg:items-center lg:justify-between">
          <SharedViewTabs value={view} onChange={setView} />
          {selectedProject && view !== "notes" ? (
            <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add task
            </Button>
          ) : null}
        </div>
      </Card>

      {message ? <div className="rounded-[var(--radius-sm)] border border-[var(--warning)] bg-[var(--warning-bg)] p-3 text-sm font-semibold text-[var(--warning)]">{message}</div> : null}

      {loading ? (
        <Card className="p-8 text-center text-sm text-[var(--text-muted)]">Loading shared project access...</Card>
      ) : selectedProject ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SharedProjectWork
            project={selectedProject}
            projects={bundle.projects}
            tasks={selectedProjectTasks}
            notes={sharedNotes}
            view={view}
            assigneeOptions={assigneeOptions}
            onAddTask={addTask}
            onUpdateTask={(id, input) => void updateTask(id, input)}
            onDeleteTask={(id) => void removeTask(id)}
            onCompleteTask={(id) => void completeTask(id)}
            onReorderTasks={(ids) => void reorderTasks(ids)}
          />
          <aside className="space-y-4">
            <Card className="p-4">
              <h2 className="text-lg font-bold text-[var(--text)]">Project Context</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-muted)]">
                <span>{startDateLabel(selectedProject.startDate, selectedProject.startTime)}</span>
                <span>{dateLabel(selectedProject.dueDate, selectedProject.dueTime)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{selectedProject.description || "No project description yet."}</p>
            </Card>
            <Card className="p-4">
              <h2 className="text-lg font-bold text-[var(--text)]">Team-visible Notes</h2>
              <div className="mt-3 space-y-2">
                {sharedNotes.length ? (
                  sharedNotes.map((note) => <SharedNoteCard key={note.id} note={note} />)
                ) : (
                  <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-5 text-center text-sm text-[var(--text-muted)]">
                    No team-visible notes for this project.
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      ) : (
        <Card className="p-10 text-center">
          <UserCheck className="mx-auto text-[var(--text-soft)]" />
          <h2 className="mt-3 text-xl font-bold text-[var(--text)]">No shared projects yet</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Ask the project owner to invite this email to a project.</p>
        </Card>
      )}
      {selectedProject ? (
        <Modal title="Add shared task" open={addOpen} onClose={() => setAddOpen(false)}>
          <TaskForm projects={bundle.projects} lockedProject={selectedProject} assigneeOptions={assigneeOptions} onSubmit={(input) => void addTask(input)} onCancel={() => setAddOpen(false)} />
        </Modal>
      ) : null}
    </div>
  );
}

function SharedProjectWork({
  project,
  projects,
  tasks,
  notes,
  view,
  assigneeOptions,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onReorderTasks,
}: {
  project: Project;
  projects: Project[];
  tasks: Task[];
  notes: HubNote[];
  view: SharedView;
  assigneeOptions: ReturnType<typeof collaboratorAssigneeOptions>;
  onAddTask: (input: TaskInput) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
}) {
  const sharedFields: Partial<ProjectTaskFieldVisibility> = {
    project: false,
    actions: true,
    assignee: true,
  };

  if (view === "notes") {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <h2 className="text-xl font-bold text-[var(--text)]">{project.name}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{notes.length} team-visible notes</p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {notes.length ? notes.map((note) => <SharedNoteCard key={note.id} note={note} />) : <EmptyState>No team-visible notes for this project.</EmptyState>}
        </div>
      </Card>
    );
  }

  if (view === "board") {
    return <ProjectTaskBoard project={project} tasks={tasks} onAddTask={onAddTask} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} assigneeOptions={assigneeOptions} visibleFields={sharedFields} />;
  }

  if (view === "kanban") {
    return <ProjectTaskKanban project={project} tasks={tasks} onAddTask={onAddTask} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} assigneeOptions={assigneeOptions} visibleFields={sharedFields} />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <h2 className="text-xl font-bold text-[var(--text)]">{project.name}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{tasks.length} shared tasks</p>
      </div>
      <div className="p-4">
        {tasks.length ? (
          <TaskList
            tasks={tasks}
            projects={projects}
            onUpdate={onUpdateTask}
            onDelete={onDeleteTask}
            onComplete={onCompleteTask}
            lockedProjectId={project.id}
            assigneeOptions={assigneeOptions}
            visibleFields={sharedFields}
            view={view === "table" ? "table" : "cards"}
            onReorder={onReorderTasks}
          />
        ) : (
          <EmptyState>No tasks match this view.</EmptyState>
        )}
      </div>
    </Card>
  );
}

function SharedViewTabs({ value, onChange }: { value: SharedView; onChange: (value: SharedView) => void }) {
  const options = [
    { value: "cards" as const, label: "List", icon: Columns3 },
    { value: "table" as const, label: "Table", icon: Table2 },
    { value: "board" as const, label: "Board", icon: ListTree },
    { value: "kanban" as const, label: "Kanban", icon: KanbanSquare },
    { value: "notes" as const, label: "Notes", icon: StickyNote },
  ];

  return (
    <div className="align-tab-list">
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <button key={optionValue} type="button" className="align-tab" data-active={value === optionValue} onClick={() => onChange(optionValue)}>
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}

function SharedNoteCard({ note }: { note: HubNote }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        className="cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <h3 className="font-bold text-[var(--text)]">{note.title}</h3>
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{note.body}</p>
        <p className="mt-3 text-xs font-bold text-[var(--text-brand)]">Open note</p>
      </article>
      <NoteReaderModal note={open ? { title: note.title, body: note.body, tags: note.tags, favorite: note.favorite, updatedAt: note.updatedAt } : null} onClose={() => setOpen(false)} />
    </>
  );
}

function EmptyState({ children }: { children: string }) {
  return <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">{children}</div>;
}

function upsertTask(tasks: Task[], next: Task) {
  return tasks.some((task) => task.id === next.id) ? tasks.map((task) => (task.id === next.id ? next : task)) : [...tasks, next];
}
