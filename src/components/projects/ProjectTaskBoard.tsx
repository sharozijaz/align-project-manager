import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import type { Project } from "../../types/project";
import type { Task, TaskInput, TaskStatus } from "../../types/task";
import { dateLabel } from "../../utils/date";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { TaskDateTimeField } from "../tasks/TaskDateTimeField";
import { TaskOverflowMenu } from "../tasks/TaskOverflowMenu";
import { mergeProjectTaskFields, type ProjectTaskFieldVisibility } from "./projectTaskFields";

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
  onOpenTask,
  visibleFields,
}: {
  project: Project;
  tasks: Task[];
  onAddTask: (input: TaskInput) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onOpenTask?: (task: Task) => void;
  visibleFields?: Partial<ProjectTaskFieldVisibility>;
}) {
  const fields = mergeProjectTaskFields("board", visibleFields);
  const columnCount = 1 + Number(fields.status) + Number(fields.priority) + Number(fields.start) + Number(fields.due) + Number(fields.notes) + Number(fields.actions);
  const minWidth =
    360 +
    (fields.status ? 150 : 0) +
    (fields.priority ? 140 : 0) +
    (fields.start ? 220 : 0) +
    (fields.due ? 220 : 0) +
    (fields.notes ? 240 : 0) +
    (fields.actions ? 76 : 0);
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
      <div className="flex flex-col gap-2 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">Main table</h2>
          <p className="text-sm text-[var(--text-muted)]">Parent tasks and subitems stay editable without leaving the project.</p>
        </div>
        <span className="text-xs font-bold text-[var(--text-soft)]">{tasks.filter((task) => !task.parentTaskId).length} parent tasks</span>
      </div>
      <div className="space-y-5 p-2 sm:p-3">
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
                <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth }}>
                  <thead className="bg-[var(--surface-raised)] text-xs font-bold text-[var(--text-soft)]">
                    <tr>
                      <th className="w-[360px] border-r border-t border-[var(--border)] px-3 py-2 text-left">Task</th>
                      {fields.status ? <th className="w-[150px] border-r border-t border-[var(--border)] px-3 py-2 text-center">Status</th> : null}
                      {fields.priority ? <th className="w-[140px] border-r border-t border-[var(--border)] px-3 py-2 text-center">Priority</th> : null}
                      {fields.start ? <th className="w-[220px] border-r border-t border-[var(--border)] px-3 py-2 text-center">Start</th> : null}
                      {fields.due ? <th className="w-[220px] border-r border-t border-[var(--border)] px-3 py-2 text-center">Due</th> : null}
                      {fields.notes ? <th className="w-[240px] border-r border-t border-[var(--border)] px-3 py-2 text-left">Notes</th> : null}
                      {fields.actions ? <th className="w-[76px] border-t border-[var(--border)] px-3 py-2 text-right">Actions</th> : null}
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
                            onOpenTask={onOpenTask}
                            fields={fields}
                          />
                          {isOpen
                            ? subtasks.map((subtask) => (
                                <BoardRow
                                  key={subtask.id}
                                  task={subtask}
                                  level="subtask"
                                  onUpdateTask={onUpdateTask}
                                  onDeleteTask={onDeleteTask}
                                  onOpenTask={onOpenTask}
                                  fields={fields}
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
                              colSpan={columnCount}
                            />
                          ) : null}
                        </Fragment>
                      );
                    })}
                    {!groupParents.length ? (
                      <tr className="border-t border-[var(--border)]">
                        <td colSpan={columnCount} className="border-t border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--text-soft)]">
                          {group.key === "todo" ? "Add a parent task like Home Page Design, then expand it for subitems." : "Completed tasks appear here automatically."}
                        </td>
                      </tr>
                    ) : null}
                    <DraftRow
                      value={drafts[draftKey(group.key)] ?? ""}
                      placeholder="+ Add task"
                      onChange={(value) => setDrafts((current) => ({ ...current, [draftKey(group.key)]: value }))}
                      onSubmit={() => addDraftTask(group.key)}
                      colSpan={columnCount}
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
  onOpenTask,
  fields,
}: {
  task: Task;
  level: "parent" | "subtask";
  subtaskCount?: number;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onOpenTask?: (task: Task) => void;
  fields: ProjectTaskFieldVisibility;
}) {
  const priorityOption = getTaskPriorityOption(task.priority);
  const statusOption = getTaskStatusOption(task.status);

  return (
    <tr className={`group align-top transition hover:bg-[var(--surface-hover)] ${level === "subtask" ? "bg-[var(--bg-soft)]/40" : ""}`} onDoubleClick={() => onOpenTask?.(task)}>
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
      {fields.status ? <td className="border-r border-t border-[var(--border)] p-0">
        <Select value={task.status} onChange={(event) => onUpdateTask(task.id, { status: event.target.value as Task["status"] })} className="min-h-10 rounded-none border-0 text-center font-bold sm:min-h-10" style={{ backgroundColor: statusOption.bg, color: statusOption.text, borderColor: statusOption.border }}>
          {taskStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </td> : null}
      {fields.priority ? <td className="border-r border-t border-[var(--border)] p-0">
        <Select value={task.priority} onChange={(event) => onUpdateTask(task.id, { priority: event.target.value as Task["priority"] })} className="min-h-10 rounded-none border-0 text-center font-bold sm:min-h-10" style={{ backgroundColor: priorityOption.bg, color: priorityOption.text, borderColor: priorityOption.border }}>
          {taskPriorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </td> : null}
      {fields.start ? <td className="border-r border-t border-[var(--border)] px-2 py-1.5">
        <TaskDateTimeField
          compact
          label="Start"
          date={task.startDate}
          time={task.startTime}
          onDateChange={(value) => onUpdateTask(task.id, { startDate: value || undefined, startTime: value ? task.startTime : undefined })}
          onTimeChange={(value) => onUpdateTask(task.id, { startTime: value || undefined })}
        />
      </td> : null}
      {fields.due ? <td className="border-r border-t border-[var(--border)] px-2 py-1.5">
        <TaskDateTimeField
          compact
          label="Due"
          summary={dateLabel(task.dueDate, task.dueTime)}
          date={task.dueDate}
          time={task.dueTime}
          onDateChange={(value) => onUpdateTask(task.id, { dueDate: value || undefined, dueTime: value ? task.dueTime : undefined })}
          onTimeChange={(value) => onUpdateTask(task.id, { dueTime: value || undefined })}
        />
      </td> : null}
      {fields.notes ? <td className="border-r border-t border-[var(--border)] px-2 py-1.5">
        <InlineText value={task.description ?? ""} placeholder="Add note" onSave={(description) => onUpdateTask(task.id, { description: description || undefined })} />
      </td> : null}
      {fields.actions ? <td className="border-t border-[var(--border)] px-2 py-1.5">
        <div className="flex justify-end opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <TaskOverflowMenu task={task} onOpen={onOpenTask} onDelete={onDeleteTask} />
        </div>
      </td> : null}
    </tr>
  );
}

function DraftRow({ value, placeholder, indent = false, colSpan, onChange, onSubmit }: { value: string; placeholder: string; indent?: boolean; colSpan: number; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <tr className="bg-[var(--surface)]">
      <td className="border-t border-[var(--border)] px-2 py-1.5" colSpan={colSpan}>
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
