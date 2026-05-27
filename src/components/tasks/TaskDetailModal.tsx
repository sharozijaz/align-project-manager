import { CalendarDays, CheckCircle2, Plus, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getTaskPriorityOption, getTaskStatusOption, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import type { AssigneeOption } from "../../types/collaboration";
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
import { TaskAssigneePicker } from "./TaskAssigneePicker";

type TaskDraft = {
  title: string;
  description: string;
  assigneeEmail: string;
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
  assigneeOptions = [],
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
  assigneeOptions?: AssigneeOption[];
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
  const projectContext = project ?? (task?.projectId ? projects.find((item) => item.id === task.projectId) : undefined);
  const subtasks = useMemo(() => (task ? tasks.filter((item) => item.parentTaskId === task.id) : []), [task, tasks]);
  const linkedNotes = useMemo(() => {
    if (!projectContext) return [];
    return notes.filter((note) => note.projectIds?.includes(projectContext.id));
  }, [notes, projectContext]);

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

  const updateAssignee = (option: AssigneeOption | null) => {
    const email = option?.email ?? "";
    updateDraftAndPersist(
      { assigneeEmail: email },
      {
        assigneeEmail: email,
        assigneeUserId: option?.userId ?? "",
        assignedAt: email && normalizeEmail(email) !== normalizeEmail(task.assigneeEmail) ? new Date().toISOString() : task.assignedAt,
      },
    );
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
        assigneeEmail: task.assigneeEmail ?? "",
        assigneeUserId: task.assigneeUserId ?? "",
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

  return (
    <>
      <Modal title="Task details" open={open} onClose={onClose} className="max-h-[92vh] w-[min(96vw,1180px)] !max-w-none overflow-y-auto">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            {error ? (
              <div className="rounded-[var(--radius-sm)] border border-amber-500/70 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-200">
                {error}
              </div>
            ) : null}
            <div className="space-y-3">
              <Input
                value={draft.title}
                readOnly={readOnly}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                className="min-h-12 text-xl font-black"
              />
              <textarea
                value={draft.description}
                readOnly={readOnly}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Add description, handoff notes, acceptance criteria..."
                className="min-h-28 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-3 text-sm font-medium leading-6 text-[var(--text)] outline-none transition hover:border-[var(--border-strong)] focus:border-[var(--brand-primary)]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project">
                <div className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--text)]">
                  {projectContext?.name ?? task.category}
                </div>
              </Field>
              <Field label="Assignee">
                <TaskAssigneePicker
                  value={draft.assigneeEmail}
                  options={assigneeOptions}
                  disabled={readOnly}
                  onChange={updateAssignee}
                />
              </Field>
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

            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">Timeline</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">Start, due date, and optional time</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
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
            </section>

            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h3 className="font-bold text-[var(--text)]">Subtasks</h3>
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
                {!subtasks.length ? <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-4 text-center text-sm text-[var(--text-muted)]">No subtasks yet.</p> : null}
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

            <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--border)] pt-4">
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

          <aside className="space-y-3">
            <InfoCard icon={<CheckCircle2 size={16} />} title="Workflow">
              <div className="flex flex-wrap gap-2">
                <OptionBadge option={statusOption} />
                <OptionBadge option={priorityOption} />
              </div>
            </InfoCard>
            <InfoCard icon={<UserRound size={16} />} title="Ownership">
              <p className="text-sm text-[var(--text-muted)]">{draft.assigneeEmail || "Unassigned"}</p>
            </InfoCard>
            <InfoCard icon={<CalendarDays size={16} />} title="Timeline">
              <p className="text-sm text-[var(--text-muted)]">{startDateLabel(draft.startDate, draft.startTime)}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{dateLabel(draft.dueDate, draft.dueTime)}</p>
            </InfoCard>
            <InfoCard title="Linked notes">
              <div className="space-y-2">
                {linkedNotes.length ? linkedNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                    onClick={() => setSelectedNote(note)}
                  >
                    <span className="block truncate text-sm font-bold text-[var(--text)]">{note.title}</span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">Open note</span>
                  </button>
                )) : <p className="text-sm text-[var(--text-muted)]">No team-visible or linked notes for this task yet.</p>}
              </div>
            </InfoCard>
            <InfoCard title="Activity">
              <p className="text-sm text-[var(--text-muted)]">Saving states are tracked now. Full activity history can come later.</p>
            </InfoCard>
          </aside>
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
    assigneeEmail: task?.assigneeEmail ?? "",
    status: task?.status ?? "not_started",
    priority: task?.priority ?? "medium",
    startDate: task?.startDate ?? "",
    startTime: task?.startTime ?? "",
    dueDate: task?.dueDate ?? "",
    dueTime: task?.dueTime ?? "",
  };
}

function normalizeEmail(value?: string) {
  return (value ?? "").trim().toLowerCase();
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
    <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text)]">
        <CalendarDays size={15} />
        {label}
      </h3>
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">Date</span>
          <Input type="date" value={date} disabled={disabled} onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">Time</span>
          <Input type="time" value={time} disabled={disabled} placeholder="No time" onChange={(event) => onTimeChange(event.target.value)} />
        </label>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</span>
      {children}
    </label>
  );
}

function InfoCard({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[var(--text)]">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}
