import { type ReactNode, useState } from "react";
import { CalendarDays, ChevronDown, Clock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { taskPriorityOptions } from "../../config/taskOptions";
import type { Project, ProjectInput } from "../../types/project";

const blank: ProjectInput = {
  name: "",
  description: "",
  area: "business",
  status: "active",
  priority: "medium",
  startDate: "",
  startTime: "",
  dueDate: "",
  dueTime: "",
  notes: [],
};

export function ProjectForm({
  initialProject,
  onSubmit,
  onCancel,
}: {
  initialProject?: Project;
  onSubmit: (input: ProjectInput) => void;
  onCancel?: () => void;
}) {
  const initialStatus =
    initialProject?.status === "paused" || initialProject?.status === "completed" || initialProject?.status === "archived"
      ? initialProject.status
      : "active";
  const [form, setForm] = useState<ProjectInput>({
    ...blank,
    ...initialProject,
    area: initialProject?.area ?? "business",
    status: initialStatus,
  });
  const [showTimeline, setShowTimeline] = useState(() => Boolean(initialProject?.startDate || initialProject?.startTime || initialProject?.dueDate || initialProject?.dueTime));
  const update = (key: keyof ProjectInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!form.name.trim()) return;
        onSubmit({
          ...form,
          name: form.name.trim(),
          startDate: form.startDate || undefined,
          startTime: form.startDate && form.startTime ? form.startTime : undefined,
          dueDate: form.dueDate || undefined,
          dueTime: form.dueDate && form.dueTime ? form.dueTime : undefined,
        });
        if (!initialProject) setForm(blank);
      }}
    >
      <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Project name" required />
      <Input value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Description" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={form.area} onChange={(event) => update("area", event.target.value)}>
          <option value="business">Business</option>
          <option value="personal">Personal</option>
        </Select>
        <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </Select>
        <Select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
          {taskPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <TimelineFields
        open={showTimeline}
        onToggle={() => setShowTimeline((current) => !current)}
        startDate={form.startDate}
        startTime={form.startTime}
        dueDate={form.dueDate}
        dueTime={form.dueTime}
        onStartDateChange={(value) => update("startDate", value)}
        onStartTimeChange={(value) => update("startTime", value)}
        onDueDateChange={(value) => update("dueDate", value)}
        onDueTimeChange={(value) => update("dueTime", value)}
      />
      <div className="flex gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">{initialProject ? "Save" : "Create Project"}</Button>
      </div>
    </form>
  );
}

function TimelineFields({
  open,
  onToggle,
  startDate,
  startTime,
  dueDate,
  dueTime,
  onStartDateChange,
  onStartTimeChange,
  onDueDateChange,
  onDueTimeChange,
}: {
  open: boolean;
  onToggle: () => void;
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onDueTimeChange: (value: string) => void;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={onToggle} aria-expanded={open}>
        <span>
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Timeline</span>
          <span className="mt-1 block text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)]">
            {open ? "Start, due date, and optional time" : timelineSummary(startDate, dueDate)}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--bg-muted)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-muted)]">
          {open ? "Hide" : "Optional"}
          <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DateTimeCard
                label="Start"
                date={startDate}
                time={startTime}
                onDateChange={onStartDateChange}
                onTimeChange={onStartTimeChange}
              />
              <DateTimeCard
                label="Due"
                date={dueDate}
                time={dueTime}
                onDateChange={onDueDateChange}
                onTimeChange={onDueTimeChange}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function DateTimeCard({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  label: string;
  date?: string;
  time?: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text)]">
        <CalendarDays size={16} className="text-[var(--text-soft)]" />
        {label}
      </div>
      <div className="grid gap-2">
        <FieldLabel text="Date">
          <Input className="min-w-0 font-bold" type="date" value={date ?? ""} onChange={(event) => onDateChange(event.target.value)} aria-label={`${label} date`} />
        </FieldLabel>
        <FieldLabel text="Time">
          <OptionalTimeInput value={time ?? ""} onChange={onTimeChange} ariaLabel={`${label} time`} />
        </FieldLabel>
      </div>
    </div>
  );
}

function FieldLabel({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">
      <span>{text}</span>
      {children}
    </label>
  );
}

function OptionalTimeInput({ value, onChange, ariaLabel }: { value: string; onChange: (value: string) => void; ariaLabel: string }) {
  const [focused, setFocused] = useState(false);
  const showPlaceholder = !value && !focused;

  return (
    <div className="relative">
      <Input
        className={`pr-10 font-bold ${showPlaceholder ? "text-transparent" : ""}`}
        type="time"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
      />
      {showPlaceholder ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold normal-case tracking-normal text-[var(--input-placeholder)]">
          No time
        </span>
      ) : null}
      <Clock size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
    </div>
  );
}

function timelineSummary(startDate?: string, dueDate?: string) {
  if (startDate && dueDate) return "Dates set. Click to edit timeline.";
  if (startDate) return "Start date set. Click to edit timeline.";
  if (dueDate) return "Due date set. Click to edit timeline.";
  return "Add start date, due date, or time";
}
