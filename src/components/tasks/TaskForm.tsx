import { ChevronDown, ChevronUp, Plus, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { format, parseISO, startOfWeek } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import {
  getTaskPriorityOption,
  getTaskStatusOption,
  isKnownTaskPriority,
  isKnownTaskStatus,
  taskReminderOptions,
  taskPriorityOptions,
  taskRecurrenceOptions,
  taskStatusOptions,
} from "../../config/taskOptions";
import type { Task, TaskInput } from "../../types/task";
import type { Project } from "../../types/project";
import type { AssigneeOption } from "../../types/assignee";
import { TaskAssigneePicker } from "./TaskAssigneePicker";
import { TaskDateTimeField } from "./TaskDateTimeField";

const blank: TaskInput = {
  title: "",
  description: "",
  category: "personal",
  priority: "medium",
  status: "not_started",
  startDate: "",
  startTime: "",
  dueDate: "",
  dueTime: "",
  reminder: "none",
  recurrence: "none",
  projectId: "",
  parentTaskId: "",
  plannedMonth: "",
  plannedWeekStart: "",
  assigneeEmail: "",
  assigneeUserId: "",
  assignedBy: "",
  assignedAt: "",
};

export function TaskForm({
  projects,
  initialTask,
  onSubmit,
  onCancel,
  compact = false,
  lockedProject,
  todoOnly = false,
  assigneeOptions = [],
}: {
  projects: Project[];
  initialTask?: Task;
  onSubmit: (input: TaskInput) => void;
  onCancel?: () => void;
  compact?: boolean;
  lockedProject?: Project;
  todoOnly?: boolean;
  assigneeOptions?: AssigneeOption[];
}) {
  const [form, setForm] = useState<TaskInput>({
    ...blank,
    ...initialTask,
    projectId: lockedProject?.id ?? initialTask?.projectId ?? "",
    reminder: initialTask?.reminder ?? "none",
    recurrence: initialTask?.recurrence ?? "none",
  });
  const hasAdvancedValues = Boolean(
    initialTask?.startDate ||
      initialTask?.startTime ||
      initialTask?.dueDate ||
      initialTask?.dueTime ||
      (initialTask?.reminder && initialTask.reminder !== "none") ||
      (initialTask?.recurrence && initialTask.recurrence !== "none") ||
      initialTask?.plannedMonth ||
      initialTask?.plannedWeekStart,
  );
  const [detailsOpen, setDetailsOpen] = useState(Boolean(!compact || hasAdvancedValues));
  const showProjectField = !todoOnly && !lockedProject;
  const showAssigneeField = !todoOnly && assigneeOptions.length > 0;
  const currentMonth = format(new Date(), "yyyy-MM");
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const selectableProjects = useMemo(
    () => projects.filter((project) => project.status === "active" || project.status === "paused" || project.id === form.projectId),
    [form.projectId, projects],
  );

  const helperText = useMemo(() => {
    const parts = [];
    if (form.startDate) parts.push("start date");
    if (form.dueDate) parts.push("due date");
    if (form.plannedMonth) parts.push("planned month");
    if (form.plannedWeekStart) parts.push("planned week");
    if (form.reminder && form.reminder !== "none") parts.push("reminder");
    if (form.recurrence && form.recurrence !== "none") parts.push("repeat");
    return parts.length ? `${parts.join(", ")} active` : "Start, due, reminders, and repeat";
  }, [form.dueDate, form.plannedMonth, form.plannedWeekStart, form.recurrence, form.reminder, form.startDate]);

  const update = (key: keyof TaskInput, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const compactGridClass = showProjectField
    ? showAssigneeField
      ? "xl:grid-cols-[minmax(240px,1fr)_minmax(170px,220px)_minmax(170px,220px)_minmax(130px,160px)_minmax(150px,180px)_auto]"
      : "xl:grid-cols-[minmax(260px,1fr)_minmax(190px,240px)_minmax(140px,170px)_minmax(160px,190px)_auto]"
    : showAssigneeField
      ? "xl:grid-cols-[minmax(260px,1fr)_minmax(170px,220px)_minmax(130px,160px)_minmax(150px,180px)_auto]"
      : "xl:grid-cols-[minmax(320px,1fr)_minmax(140px,170px)_minmax(160px,190px)_auto]";

  const titleField = (
    <Input
      value={form.title}
      onChange={(event) => update("title", event.target.value)}
      placeholder={todoOnly ? "Add a todo" : "Add a todo, task, goal, or chore"}
      required
    />
  );

  const descriptionField = <Input value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Short description" />;

  const projectField = (
    <Select value={form.projectId ?? ""} onChange={(event) => update("projectId", event.target.value)} aria-label="Project or category">
      <option value="">Todo</option>
      {selectableProjects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </Select>
  );

  const priorityField = (
    <Select value={form.priority} onChange={(event) => update("priority", event.target.value)} aria-label="Priority">
      {!isKnownTaskPriority(form.priority) ? <option value={form.priority}>{getTaskPriorityOption(form.priority).label}</option> : null}
      {taskPriorityOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );

  const statusField = (
    <Select value={form.status} onChange={(event) => update("status", event.target.value)} aria-label="Status">
      {!isKnownTaskStatus(form.status) ? <option value={form.status}>{getTaskStatusOption(form.status).label}</option> : null}
      {taskStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );

  const assigneeField = showAssigneeField ? (
    <TaskAssigneePicker
      value={form.assigneeEmail ?? ""}
      options={assigneeOptions}
      onChange={(option) => {
        setForm((current) => ({
          ...current,
          assigneeEmail: option?.email ?? "",
          assigneeUserId: option?.userId ?? "",
          assignedAt: option ? current.assignedAt || new Date().toISOString() : "",
        }));
      }}
    />
  ) : null;

  const startField = (
    <TaskDateTimeField
      label="Start"
      date={form.startDate}
      time={form.startTime}
      onDateChange={(value) => update("startDate", value)}
      onTimeChange={(value) => update("startTime", value)}
    />
  );

  const dueField = (
    <TaskDateTimeField
      label="Due"
      date={form.dueDate}
      time={form.dueTime}
      onDateChange={(value) => update("dueDate", value)}
      onTimeChange={(value) => update("dueTime", value)}
    />
  );

  const reminderField = (
    <Select value={form.reminder} onChange={(event) => update("reminder", event.target.value)} aria-label="Reminder">
      {taskReminderOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );

  const recurrenceField = (
    <Select value={form.recurrence} onChange={(event) => update("recurrence", event.target.value)} aria-label="Repeat">
      {taskRecurrenceOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
  const planningField = (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div>
          <p className="text-sm font-bold normal-case tracking-normal text-[var(--text)]">Plan this month</p>
          <p className="mt-1 text-xs font-medium normal-case tracking-normal text-[var(--text-muted)]">
            {form.plannedMonth ? `Held in ${format(parseISO(`${form.plannedMonth}-01`), "MMMM")}` : "Keep it as a monthly intention before choosing a week."}
          </p>
        </div>
        <Button
          type="button"
          variant={form.plannedMonth ? "secondary" : "ghost"}
          className="min-h-9 justify-center"
          onClick={() => update("plannedMonth", form.plannedMonth ? "" : currentMonth)}
        >
          {form.plannedMonth ? "Remove from month" : "Plan this month"}
        </Button>
      </div>
      <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div>
        <p className="text-sm font-bold normal-case tracking-normal text-[var(--text)]">Plan this week</p>
        <p className="mt-1 text-xs font-medium normal-case tracking-normal text-[var(--text-muted)]">
          {form.plannedWeekStart ? `Planned for week of ${format(parseISO(form.plannedWeekStart), "MMM d")}` : "Move it into a weekly planning bucket."}
        </p>
      </div>
      <Button
        type="button"
        variant={form.plannedWeekStart ? "secondary" : "ghost"}
        className="min-h-9 justify-center"
        onClick={() => update("plannedWeekStart", form.plannedWeekStart ? "" : currentWeekStart)}
      >
        {form.plannedWeekStart ? "Remove from week" : "Plan this week"}
      </Button>
      </div>
    </div>
  );

  const actionButtons = (
    <div className={compact ? "flex items-end gap-2" : "flex gap-2"}>
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
      <Button type="submit" icon={!initialTask ? <Plus size={16} /> : undefined} className={compact ? "min-h-11 shrink-0 px-5" : ""}>
        {initialTask ? "Save" : compact ? (todoOnly || !form.projectId ? "Add Todo" : "Add Task") : "Add"}
      </Button>
    </div>
  );

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!form.title.trim()) return;
        onSubmit({
          ...form,
          title: form.title.trim(),
          projectId: todoOnly ? undefined : lockedProject?.id ?? (form.projectId || undefined),
          category: todoOnly ? "personal" : lockedProject || form.projectId ? "project" : form.category,
          startDate: form.startDate || undefined,
          startTime: form.startDate && form.startTime ? form.startTime : undefined,
          dueDate: form.dueDate || undefined,
          dueTime: form.dueDate && form.dueTime ? form.dueTime : undefined,
          assigneeEmail: form.assigneeEmail || undefined,
          assigneeUserId: form.assigneeUserId || undefined,
          assignedAt: form.assigneeEmail ? form.assignedAt || new Date().toISOString() : undefined,
          plannedMonth: form.dueDate ? undefined : form.plannedMonth || undefined,
          plannedWeekStart: form.dueDate ? undefined : form.plannedWeekStart || undefined,
        });
        if (!initialTask) setForm(lockedProject ? { ...blank, projectId: lockedProject.id, category: "project" } : blank);
      }}
    >
      {compact ? (
        <div className="space-y-3">
          <div className={`grid gap-3 ${compactGridClass}`}>
            {titleField}
            {showProjectField ? projectField : null}
            {assigneeField}
            {priorityField}
            {statusField}
            <div className="hidden xl:block">{actionButtons}</div>
          </div>
          <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setDetailsOpen((open) => !open)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-4 text-sm font-semibold text-[var(--button-secondary-text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
              aria-expanded={detailsOpen}
            >
              <SlidersHorizontal size={16} />
              {detailsOpen ? "Hide details" : "Add details"}
              {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <span className="text-sm text-[var(--text-soft)]">{helperText}</span>
            <div className="xl:hidden">{actionButtons}</div>
          </div>
          <AnimatePresence initial={false}>
            {detailsOpen ? (
            <motion.div
              className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-sm)]"
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_minmax(280px,1fr)_minmax(190px,220px)_minmax(190px,220px)]">
                {startField}
                {dueField}
                <FieldLabel label="Reminder">{reminderField}</FieldLabel>
                <FieldLabel label="Repeat">{recurrenceField}</FieldLabel>
              </div>
              <div className="mt-3">{planningField}</div>
            </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : (
        <>
          {titleField}
          {descriptionField}
          {showProjectField ? projectField : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {priorityField}
            {statusField}
          </div>
          {assigneeField ? <FieldLabel label="Assignee">{assigneeField}</FieldLabel> : null}
          <div className="grid gap-3 lg:grid-cols-2">
            {startField}
            {dueField}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {reminderField}
            {recurrenceField}
          </div>
          {planningField}
          {actionButtons}
        </>
      )}
    </form>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">
      <span>{label}</span>
      {children}
    </label>
  );
}
