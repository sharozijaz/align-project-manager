import { type ReactNode, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, Image, Palette } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { taskPriorityOptions } from "../../config/taskOptions";
import { heroOptions } from "../../store/heroStore";
import type { Project, ProjectInput, ProjectMood } from "../../types/project";

const projectAccentOptions = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10a37f", label: "Emerald" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef476f", label: "Rose" },
  { value: "#8b5cf6", label: "Violet" },
] as const;

const projectMoodOptions: Array<{ value: ProjectMood; label: string; helper: string }> = [
  { value: "focused", label: "Focused", helper: "Priorities, blockers, and next moves." },
  { value: "creative", label: "Creative", helper: "Ideas, notes, assets, and exploration." },
  { value: "technical", label: "Technical", helper: "Fields, specs, implementation, and QA." },
  { value: "client", label: "Client", helper: "Deadlines, share links, and client context." },
  { value: "personal", label: "Personal", helper: "Lightweight personal planning." },
];

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
  coverImage: "align-gradient-emerald",
  accentColor: "#3b82f6",
  icon: "◈",
  mood: "focused",
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
  const initialCoverImage = heroOptions.some((option) => option.value === initialProject?.coverImage)
    ? initialProject?.coverImage
    : blank.coverImage;
  const [form, setForm] = useState<ProjectInput>({
    ...blank,
    ...initialProject,
    area: initialProject?.area ?? "business",
    status: initialStatus,
    coverImage: initialCoverImage,
  });
  const [showTimeline, setShowTimeline] = useState(() => Boolean(initialProject?.startDate || initialProject?.startTime || initialProject?.dueDate || initialProject?.dueTime));
  const update = (key: keyof ProjectInput, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const selectedHero = useMemo(() => heroOptions.find((option) => option.value === form.coverImage) ?? heroOptions[0], [form.coverImage]);

  return (
    <form
      className="grid gap-4"
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
          coverImage: form.coverImage || undefined,
          accentColor: form.accentColor || undefined,
          icon: form.icon?.trim() || undefined,
          mood: form.mood || undefined,
        });
        if (!initialProject) setForm(blank);
      }}
    >
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-3">
        <div className="grid gap-3">
          <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Project name" required />
          <Input value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Description" />
        </div>
      </div>
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
      <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
        <div className="flex items-center justify-between gap-3">
          <span>
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">
              <Palette size={14} />
              Project identity
            </span>
            <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">Cover, accent, and workspace type make this project easier to recognize.</span>
          </span>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-bg)] text-lg font-black text-[var(--text)]">
            {form.icon || "◈"}
          </span>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-bg)]">
            <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${selectedHero.src})` }} />
            <div className="grid gap-2 p-3 sm:grid-cols-[80px_minmax(0,1fr)]">
              <Input value={form.icon ?? ""} onChange={(event) => update("icon", event.target.value.slice(0, 2))} placeholder="Icon" aria-label="Project icon" />
              <Select value={form.mood ?? "focused"} onChange={(event) => update("mood", event.target.value)} aria-label="Workspace type">
                {projectMoodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} workspace
                  </option>
                ))}
              </Select>
              <p className="sm:col-start-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">
                {projectMoodOptions.find((option) => option.value === (form.mood ?? "focused"))?.helper}
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                <Image size={14} />
                Cover
              </span>
              <Select value={form.coverImage ?? heroOptions[0].value} onChange={(event) => update("coverImage", event.target.value)}>
                {heroOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Accent</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {projectAccentOptions.map((option) => {
                  const selected = (form.accentColor ?? projectAccentOptions[0].value) === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-label={`${option.label} accent`}
                      className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5"
                      style={{ backgroundColor: option.value }}
                      onClick={() => update("accentColor", option.value)}
                    >
                      {selected ? <Check size={16} className="text-white" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
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
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
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
        className={`font-bold ${showPlaceholder ? "text-transparent" : ""}`}
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
    </div>
  );
}

function timelineSummary(startDate?: string, dueDate?: string) {
  if (startDate && dueDate) return "Dates set. Click to edit timeline.";
  if (startDate) return "Start date set. Click to edit timeline.";
  if (dueDate) return "Due date set. Click to edit timeline.";
  return "Add start date, due date, or time";
}
