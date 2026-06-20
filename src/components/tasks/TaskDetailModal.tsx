import { CalendarDays, CheckCircle2, FolderKanban, ListChecks, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getTaskPriorityOption, getTaskStatusOption, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import { useStudioStore } from "../../store/studioStore";
import type { Project } from "../../types/project";
import type { HubNote } from "../../types/studio";
import type { Task, TaskInput } from "../../types/task";
import { dateLabel, startDateLabel } from "../../utils/date";
import { NoteReaderModal } from "../notes/NoteReaderModal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmProvider";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { OptionBadge } from "../ui/OptionBadge";
import { Select } from "../ui/Select";

type TaskDraft = {
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
};

export function TaskDetailModal({
  task,
  project,
  projects,
  tasks,
  notes = [],
  open,
  onClose,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  canDelete = true,
  readOnly = false,
}: {
  task: Task | null;
  project?: Project;
  projects: Project[];
  tasks: Task[];
  notes?: HubNote[];
  open: boolean;
  onClose: () => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void | Promise<void>;
  onAddTask?: (input: TaskInput) => void | Promise<void>;
  onDeleteTask?: (id: string) => void | Promise<void>;
  canDelete?: boolean;
  readOnly?: boolean;
}) {
  const confirm = useConfirm();
  const [draft, setDraft] = useState<TaskDraft>(() => toDraft(task));
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");
  const [selectedNote, setSelectedNote] = useState<HubNote | null>(null);
  const addNote = useStudioStore((state) => state.addNote);
  const projectContext = project ?? (task?.projectId ? projects.find((item) => item.id === task.projectId) : undefined);
  const subtasks = useMemo(() => (task ? tasks.filter((item) => item.parentTaskId === task.id) : []), [task, tasks]);
  const projectNotes = useMemo(() => {
    if (!projectContext) return [];
    return notes.filter((note) => note.projectIds?.includes(projectContext.id));
  }, [notes, projectContext]);
  const linkedNotes = useMemo(() => {
    const linkedIds = new Set(task?.linkedNoteIds ?? []);
    return projectNotes.filter((note) => linkedIds.has(note.id));
  }, [projectNotes, task?.linkedNoteIds]);

  useEffect(() => {
    setDraft(toDraft(task));
    setSubtaskTitle("");
    setSavedAt("");
    setError("");
  }, [task]);

  useEffect(() => {
    if (!task || readOnly) return;
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (!title) return;
    if (title === task.title && description === (task.description ?? "")) return;
    const timeout = window.setTimeout(() => {
      void persistTask({ title, description });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [draft.title, draft.description, readOnly, task?.id]);

  if (!task) return null;

  const statusOption = getTaskStatusOption(draft.status);
  const priorityOption = getTaskPriorityOption(draft.priority);

  const persistTask = async (input: Partial<TaskInput>) => {
    if (readOnly) return;
    setSaving(true);
    setError("");
    try {
      await onUpdateTask(task.id, input);
      setSavedAt(new Date().toISOString());
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not save task.");
    } finally {
      setSaving(false);
    }
  };

  const updateDraftAndPersist = (nextDraft: Partial<TaskDraft>, input: Partial<TaskInput>) => {
    setDraft((current) => ({ ...current, ...nextDraft }));
    void persistTask(input);
  };

  const saveTaskBeforeClose = async () => {
    if (readOnly) return;
    const title = draft.title.trim();
    if (!title || (title === task.title && draft.description.trim() === (task.description ?? ""))) return;
    setSaving(true);
    setError("");
    try {
      await onUpdateTask(task.id, {
        title,
        description: draft.description.trim(),
      });
      setSavedAt(new Date().toISOString());
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not save task.");
    } finally {
      setSaving(false);
    }
  };

  const addSubtask = async () => {
    if (!onAddTask || readOnly) return;
    const title = subtaskTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      await onAddTask({
        title,
        description: "",
        projectId: projectContext?.id ?? task.projectId,
        parentTaskId: task.id,
        category: "project",
        priority: task.priority,
        status: "not_started",
        startDate: "",
        startTime: "",
        dueDate: "",
        dueTime: "",
        reminder: "none",
        recurrence: "none",
      });
      setSubtaskTitle("");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!onDeleteTask || !canDelete || readOnly) return;
    const confirmed = await confirm({
      title: "Delete task?",
      description: `"${task.title}" will move out of this project view.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;
    await onDeleteTask(task.id);
    onClose();
  };

  const toggleLinkedNote = (noteId: string) => {
    if (readOnly) return;
    const next = new Set(task.linkedNoteIds ?? []);
    if (next.has(noteId)) next.delete(noteId);
    else next.add(noteId);
    void persistTask({ linkedNoteIds: [...next] });
  };

  const createLinkedDoc = () => {
    if (readOnly || !projectContext) return;
    const created = addNote({
      title: `${task.title} Notes`,
      body: `# ${task.title} Notes\n\n## Context\n\n## Decisions\n\n## Follow-up\n\n- [ ] \n`,
      docType: "general",
      docStatus: "draft",
      clientVisible: false,
      favorite: false,
      projectIds: [projectContext.id],
      relatedNoteIds: [],
    });
    void persistTask({ linkedNoteIds: [...(task.linkedNoteIds ?? []), created.id] });
    setSelectedNote(created);
  };

  return (
    <>
      <Modal
        title="Task details"
        description={projectContext ? `Edit work, subtasks, timing, and notes for ${projectContext.name}.` : "Edit personal task details, timing, and subtasks."}
        open={open}
        onClose={onClose}
        className="w-[min(94vw,1040px)] !max-w-[1040px]"
      >
        <div className="space-y-4">
          {error ? (
            <div className="rounded-[var(--radius-sm)] border border-amber-500/70 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-200">
              {error}
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone="slate">{projectContext?.name ?? task.category}</Badge>
                  <OptionBadge option={statusOption} />
                  <OptionBadge option={priorityOption} />
                  <span className="ml-auto text-xs font-bold text-[var(--text-muted)]">
                    {saving ? "Saving..." : savedAt ? "Saved" : "Autosaves changes"}
                  </span>
                </div>
                <Input
                  value={draft.title}
                  readOnly={readOnly}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="min-h-11 border-transparent bg-transparent px-0 text-xl font-bold hover:border-transparent focus:border-transparent"
                />
                <textarea
                  value={draft.description}
                  readOnly={readOnly}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Add description, handoff notes, acceptance criteria..."
                  className="mt-2 min-h-24 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm font-medium leading-6 text-[var(--text)] outline-none transition hover:border-[var(--border-strong)] focus:border-[var(--brand-primary)]"
                />
              </section>

              <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
                <h3 className="flex items-center gap-2 font-bold text-[var(--text)]">
                  <ListChecks size={16} />
                  Subtasks
                </h3>
                <Badge>{subtasks.length} items</Badge>
              </div>
              <div className="space-y-2 p-3">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-2 sm:grid-cols-[minmax(0,1fr)_150px_38px]">
                    <Input
                      value={subtask.title}
                      readOnly={readOnly}
                      onChange={(event) => onUpdateTask(subtask.id, { title: event.target.value })}
                      className="align-field-quiet min-h-9 sm:min-h-9"
                    />
                    <Select
                      value={subtask.status}
                      disabled={readOnly}
                      onChange={(event) => onUpdateTask(subtask.id, { status: event.target.value as Task["status"] })}
                      className="min-h-9 sm:min-h-9"
                    >
                      {taskStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {!readOnly && onDeleteTask ? (
                      <Button variant="danger" className="min-h-9 px-2 sm:min-h-9" title="Delete subtask" onClick={() => onDeleteTask(subtask.id)}>
                        <Trash2 size={14} />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {!subtasks.length ? <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-3 text-center text-sm text-[var(--text-muted)]">No subtasks yet.</p> : null}
                {!readOnly && onAddTask ? (
                  <div className="flex gap-2 pt-1">
                    <Input value={subtaskTitle} placeholder="Add subtask" onChange={(event) => setSubtaskTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addSubtask(); }} />
                    <Button type="button" icon={<Plus size={16} />} onClick={() => void addSubtask()} disabled={saving}>
                      Add
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>
            </div>

            <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
              <InfoCard icon={<FolderKanban size={16} />} title="Project">
                <p className="text-sm font-bold text-[var(--text)]">{projectContext?.name ?? task.category}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{task.parentTaskId ? "Subtask" : "Parent task"}</p>
              </InfoCard>
            <InfoCard icon={<CheckCircle2 size={16} />} title="Workflow">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="Status">
                  <Select
                    value={draft.status}
                    disabled={readOnly}
                    onChange={(event) => {
                      const status = event.target.value as Task["status"];
                      updateDraftAndPersist({ status }, { status });
                    }}
                  >
                    {taskStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select
                    value={draft.priority}
                    disabled={readOnly}
                    onChange={(event) => {
                      const priority = event.target.value as Task["priority"];
                      updateDraftAndPersist({ priority }, { priority });
                    }}
                  >
                    {taskPriorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </InfoCard>
            <InfoCard icon={<CalendarDays size={16} />} title="Timeline">
              <div className="grid gap-3">
                <TimelineCard
                  label="Start"
                  date={draft.startDate}
                  time={draft.startTime}
                  disabled={readOnly}
                  onDateChange={(value) => updateDraftAndPersist({ startDate: value }, { startDate: value })}
                  onTimeChange={(value) => updateDraftAndPersist({ startTime: value }, { startTime: value })}
                />
                <TimelineCard
                  label="Due"
                  date={draft.dueDate}
                  time={draft.dueTime}
                  disabled={readOnly}
                  onDateChange={(value) => updateDraftAndPersist({ dueDate: value }, { dueDate: value })}
                  onTimeChange={(value) => updateDraftAndPersist({ dueTime: value }, { dueTime: value })}
                />
              </div>
              <p className="mt-3 text-xs font-bold text-[var(--text-muted)]">{startDateLabel(draft.startDate, draft.startTime)} · {dateLabel(draft.dueDate, draft.dueTime)}</p>
            </InfoCard>
            <InfoCard title="Linked docs">
              <div className="space-y-2">
                {linkedNotes.length ? linkedNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                    onClick={() => setSelectedNote(note)}
                  >
                    <span className="block truncate text-sm font-bold text-[var(--text)]">{note.title}</span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">Open document</span>
                  </button>
                )) : <p className="text-sm text-[var(--text-muted)]">No docs linked to this task yet.</p>}
                {!readOnly ? (
                  <>
                    <div className="max-h-44 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-2">
                      {projectNotes.length ? projectNotes.map((note) => (
                        <label key={note.id} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-xs)] px-2 py-1.5 text-xs font-bold text-[var(--text)] hover:bg-[var(--surface-hover)]">
                          <input type="checkbox" checked={(task.linkedNoteIds ?? []).includes(note.id)} onChange={() => toggleLinkedNote(note.id)} />
                          <span className="min-w-0 truncate">{note.title}</span>
                        </label>
                      )) : <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">No project docs yet.</p>}
                    </div>
                    {projectContext ? (
                      <Button type="button" variant="secondary" className="w-full" icon={<Plus size={14} />} onClick={createLinkedDoc}>
                        New Linked Doc
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </InfoCard>
            <InfoCard title="Activity">
              <p className="text-sm text-[var(--text-muted)]">Saving states are tracked now. Full activity history can come later.</p>
            </InfoCard>
          </aside>
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--border)] pt-3">
            {canDelete && onDeleteTask && !readOnly ? (
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => void deleteTask()}>
                Delete
              </Button>
            ) : <span />}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--text-muted)]">{saving ? "Saving..." : savedAt ? "Saved" : "Autosaves changes"}</span>
              <Button
                variant="secondary"
                onClick={async () => {
                  await saveTaskBeforeClose();
                  onClose();
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      <NoteReaderModal note={selectedNote ? { title: selectedNote.title, body: selectedNote.body, tags: selectedNote.tags, favorite: selectedNote.favorite, updatedAt: selectedNote.updatedAt } : null} onClose={() => setSelectedNote(null)} />
    </>
  );
}

function toDraft(task: Task | null): TaskDraft {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "not_started",
    priority: task?.priority ?? "medium",
    startDate: task?.startDate ?? "",
    startTime: task?.startTime ?? "",
    dueDate: task?.dueDate ?? "",
    dueTime: task?.dueTime ?? "",
  };
}

function TimelineCard({
  label,
  date,
  time,
  disabled,
  onDateChange,
  onTimeChange,
}: {
  label: string;
  date: string;
  time: string;
  disabled?: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text)]">
        <CalendarDays size={15} />
        {label}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Date</span>
          <Input type="date" value={date} disabled={disabled} className="min-h-9 sm:min-h-9" onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Time</span>
          <Input type="time" value={time} disabled={disabled} placeholder="No time" className="min-h-9 sm:min-h-9" onChange={(event) => onTimeChange(event.target.value)} />
        </label>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">{label}</span>
      {children}
    </label>
  );
}

function InfoCard({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text)]">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}
