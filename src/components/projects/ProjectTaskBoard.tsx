import { ChevronDown, ChevronRight, Check, Plus, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import type { Project } from "../../types/project";
import type { Task, TaskInput, TaskStatus } from "../../types/task";
import { dateLabel } from "../../utils/date";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

type BoardGroupKey = "todo" | "completed";

const boardGroups: Array<{ key: BoardGroupKey; label: string; accent: string; defaultStatus: TaskStatus }> = [
  { key: "todo", label: "To-Do", accent: "var(--brand-primary)", defaultStatus: "not_started" },
  { key: "completed", label: "Completed", accent: "var(--status-completed-text)", defaultStatus: "done" },
];

const baseTask = (project: Project, status: TaskStatus, parentTaskId?: string): TaskInput => ({
  title: "",
  description: "",
  projectId: project.id,
  parentTaskId,
  category: "project",
  priority: "medium",
  status,
  startDate: "",
  startTime: "",
  dueDate: "",
  dueTime: "",
  reminder: "none",
  recurrence: "none",
});

export function ProjectTaskBoard({
  project,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}: {
  project: Project;
  tasks: Task[];
  onAddTask: (input: TaskInput) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(tasks.filter((task) => !task.parentTaskId).map((task) => task.id)));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const subtasksByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.parentTaskId) return;
      map.set(task.parentTaskId, [...(map.get(task.parentTaskId) ?? []), task]);
    });
    return map;
  }, [tasks]);
  const parentTasks = useMemo(() => tasks.filter((task) => !task.parentTaskId), [tasks]);

  const addDraftTask = (group: BoardGroupKey, parentTaskId?: string) => {
    const key = draftKey(group, parentTaskId);
    const title = drafts[key]?.trim();
    if (!title) return;

    const parentTask = parentTaskId ? tasks.find((task) => task.id === parentTaskId) : undefined;
    const status = parentTask?.status ?? boardGroups.find((item) => item.key === group)?.defaultStatus ?? "not_started";
    onAddTask({ ...baseTask(project, status, parentTaskId), title });
    setDrafts((current) => ({ ...current, [key]: "" }));
    if (parentTaskId) setExpanded((current) => new Set(current).add(parentTaskId));
  };

  const toggleExpanded = (taskId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">Main table</h2>
          <p className="text-sm text-[var(--text-muted)]">Parent tasks and subitems stay editable without leaving the project.</p>
        </div>
        <span className="text-xs font-bold text-[var(--text-soft)]">{tasks.filter((task) => !task.parentTaskId).length} parent tasks</span>
      </div>
      <div className="space-y-8 p-2 sm:p-3">
        {boardGroups.map((group) => {
          const groupParents = parentTasks.filter((task) => getGroupKey(task) === group.key);
          const groupTasks = tasks.filter((task) => getGroupKey(task.parentTaskId ? tasks.find((item) => item.id === task.parentTaskId) ?? task : task) === group.key);
          const doneCount = groupTasks.filter((task) => isTerminalTaskStatus(task.status)).length;

          return (
            <section key={group.key} className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] px-4 py-2.5" style={{ borderLeft: `4px solid ${group.accent}` }}>
                <div className="flex items-center gap-2">
                  <ChevronDown size={16} style={{ color: group.accent }} />
                  <h3 className="font-display text-lg font-bold" style={{ color: group.accent }}>{group.label}</h3>
                  <span className="text-xs text-[var(--text-soft)]">{groupTasks.length ? `${doneCount}/${groupTasks.length} done` : "No tasks yet"}</span>
                </div>
                <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                  {groupParents.length} {groupParents.length === 1 ? "task" : "tasks"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1320px] w-full table-fixed border-collapse text-sm">
                  <thead className="bg-[var(--surface-raised)] text-xs font-bold text-[var(--text-soft)]">
                    <tr>
                      <th className="w-[44px] border-r border-t border-[var(--border)] px-2 py-2 text-center">
                        <span className="inline-block h-4 w-4 rounded border border-[var(--border-strong)]" />
                      </th>
                      <th className="w-[360px] border-r border-t border-[var(--border)] px-3 py-2 text-left">Task</th>
                      <th className="w-[180px] border-r border-t border-[var(--border)] px-3 py-2 text-center">Status</th>
                      <th className="w-[160px] border-r border-t border-[var(--border)] px-3 py-2 text-center">Priority</th>
                      <th className="w-[170px] border-r border-t border-[var(--border)] px-3 py-2 text-center">Start</th>
                      <th className="w-[170px] border-r border-t border-[var(--border)] px-3 py-2 text-center">Due</th>
                      <th className="w-[280px] border-r border-t border-[var(--border)] px-3 py-2 text-left">Notes</th>
                      <th className="w-[130px] border-t border-[var(--border)] px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupParents.map((task) => {
                      const subtasks = subtasksByParent.get(task.id) ?? [];
                      const isOpen = expanded.has(task.id);

                      return (
                        <Fragment key={task.id}>
                          <BoardRow
                            task={task}
                            level="parent"
                            subtaskCount={subtasks.length}
                            expanded={isOpen}
                            onToggleExpanded={() => toggleExpanded(task.id)}
                            onUpdateTask={onUpdateTask}
                            onDeleteTask={onDeleteTask}
                            onCompleteTask={onCompleteTask}
                          />
                          {isOpen
                            ? subtasks.map((subtask) => (
                                <BoardRow
                                  key={subtask.id}
                                  task={subtask}
                                  level="subtask"
                                  onUpdateTask={onUpdateTask}
                                  onDeleteTask={onDeleteTask}
                                  onCompleteTask={onCompleteTask}
                                />
                              ))
                            : null}
                          {isOpen ? (
                            <DraftRow
                              value={drafts[draftKey(group.key, task.id)] ?? ""}
                              placeholder="+ Add subitem"
                              indent
                              onChange={(value) => setDrafts((current) => ({ ...current, [draftKey(group.key, task.id)]: value }))}
                              onSubmit={() => addDraftTask(group.key, task.id)}
                            />
                          ) : null}
                        </Fragment>
                      );
                    })}
                    {!groupParents.length ? (
                      <tr className="border-t border-[var(--border)]">
                        <td colSpan={8} className="border-t border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--text-soft)]">
                          {group.key === "todo" ? "Add a parent task like Home Page Design, then expand it for subitems." : "Completed tasks appear here automatically."}
                        </td>
                      </tr>
                    ) : null}
                    <DraftRow
                      value={drafts[draftKey(group.key)] ?? ""}
                      placeholder="+ Add task"
                      onChange={(value) => setDrafts((current) => ({ ...current, [draftKey(group.key)]: value }))}
                      onSubmit={() => addDraftTask(group.key)}
                    />
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function BoardRow({
  task,
  level,
  subtaskCount = 0,
  expanded = false,
  onToggleExpanded,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}: {
  task: Task;
  level: "parent" | "subtask";
  subtaskCount?: number;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
}) {
  const priorityOption = getTaskPriorityOption(task.priority);
  const statusOption = getTaskStatusOption(task.status);

  return (
    <tr className={`group align-top transition hover:bg-[var(--surface-hover)] ${level === "subtask" ? "bg-[var(--bg-soft)]/40" : ""}`}>
      <td className="border-r border-t border-[var(--border)] px-2 py-2 text-center">
        <span className="inline-block h-4 w-4 rounded border border-[var(--border-strong)] bg-[var(--surface)]" />
      </td>
      <td className="border-r border-t border-[var(--border)] px-2 py-1.5">
        <div className={`flex min-w-0 items-center gap-2 ${level === "subtask" ? "pl-8" : ""}`}>
          {level === "parent" ? (
            <button type="button" onClick={onToggleExpanded} className="grid h-8 w-8 shrink-0 place-items-center rounded border border-transparent text-[var(--text-muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)]">
              {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : (
            <span className="h-px w-5 shrink-0 bg-[var(--border-strong)]" />
          )}
          <InlineText value={task.title} className="font-semibold" onSave={(title) => onUpdateTask(task.id, { title })} />
          {level === "parent" && subtaskCount ? <span className="shrink-0 rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-soft)]">{subtaskCount}</span> : null}
        </div>
      </td>
      <td className="border-r border-t border-[var(--border)] p-0">
        <Select value={task.status} onChange={(event) => onUpdateTask(task.id, { status: event.target.value as Task["status"] })} className="min-h-11 rounded-none border-0 text-center font-bold sm:min-h-11" style={{ backgroundColor: statusOption.bg, color: statusOption.text, borderColor: statusOption.border }}>
          {taskStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </td>
      <td className="border-r border-t border-[var(--border)] p-0">
        <Select value={task.priority} onChange={(event) => onUpdateTask(task.id, { priority: event.target.value as Task["priority"] })} className="min-h-11 rounded-none border-0 text-center font-bold sm:min-h-11" style={{ backgroundColor: priorityOption.bg, color: priorityOption.text, borderColor: priorityOption.border }}>
          {taskPriorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </td>
      <td className="border-r border-t border-[var(--border)] px-2 py-1.5">
        <Input className="min-h-9 border-transparent bg-transparent text-center hover:border-[var(--border)] hover:bg-[var(--surface-raised)] focus:bg-[var(--surface-raised)] sm:min-h-9" type="date" value={task.startDate ?? ""} onChange={(event) => onUpdateTask(task.id, { startDate: event.target.value || undefined })} />
      </td>
      <td className="border-r border-t border-[var(--border)] px-2 py-1.5">
        <Input className="min-h-9 border-transparent bg-transparent text-center hover:border-[var(--border)] hover:bg-[var(--surface-raised)] focus:bg-[var(--surface-raised)] sm:min-h-9" type="date" value={task.dueDate ?? ""} onChange={(event) => onUpdateTask(task.id, { dueDate: event.target.value || undefined })} />
        <p className="mt-1 text-xs text-[var(--text-soft)]">{dateLabel(task.dueDate, task.dueTime)}</p>
      </td>
      <td className="border-r border-t border-[var(--border)] px-2 py-1.5">
        <InlineText value={task.description ?? ""} placeholder="Add note" onSave={(description) => onUpdateTask(task.id, { description: description || undefined })} />
      </td>
      <td className="border-t border-[var(--border)] px-2 py-1.5">
        <div className="flex justify-end gap-2 opacity-70 transition group-hover:opacity-100">
          <Button title="Mark done" variant="secondary" className="px-3" onClick={() => onCompleteTask(task.id)} disabled={isTerminalTaskStatus(task.status)}>
            <Check size={15} />
          </Button>
          <Button title="Delete" variant="danger" className="px-3" onClick={() => onDeleteTask(task.id)}>
            <Trash2 size={15} />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function DraftRow({ value, placeholder, indent = false, onChange, onSubmit }: { value: string; placeholder: string; indent?: boolean; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <tr className="bg-[var(--surface)]">
      <td className="border-r border-t border-[var(--border)] px-2 py-2" />
      <td className="border-t border-[var(--border)] px-2 py-1.5" colSpan={7}>
        <div className={`flex gap-2 ${indent ? "pl-14" : ""}`}>
          <Input
            className="min-h-9 border-transparent bg-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--surface-raised)] focus:bg-[var(--surface-raised)] sm:min-h-9"
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmit();
            }}
          />
          <Button type="button" variant="ghost" className="min-h-9 shrink-0 px-3" icon={<Plus size={15} />} onClick={onSubmit}>
            Add
          </Button>
        </div>
      </td>
    </tr>
  );
}

function InlineText({ value, placeholder = "Untitled", className = "", onSave }: { value: string; placeholder?: string; className?: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    if (next !== value) onSave(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setDraft(value);
      event.currentTarget.blur();
    }
  };

  return (
    <Input
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={`min-h-9 border-transparent bg-transparent hover:border-[var(--border)] hover:bg-[var(--surface-raised)] focus:bg-[var(--surface-raised)] sm:min-h-9 ${className}`}
    />
  );
}

function getGroupKey(task: Task): BoardGroupKey {
  return isTerminalTaskStatus(task.status) ? "completed" : "todo";
}

function draftKey(group: BoardGroupKey, parentTaskId = "parent") {
  return `${group}:${parentTaskId}`;
}
