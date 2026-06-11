import { AlertTriangle, BookOpen, CalendarDays, Plus, Star, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isTerminalTaskStatus } from "../config/taskOptions";
import { useCalendarStore } from "../store/calendarStore";
import { useProjectStore } from "../store/projectStore";
import { useStudioStore } from "../store/studioStore";
import { useTaskStore } from "../store/taskStore";
import type { TaskInput } from "../types/task";
import { dateLabel, isOverdue, isToday } from "../utils/date";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";

type QuickCaptureKind = "project-task" | "todo" | "doc";

export function Today() {
  const projects = useProjectStore((state) => state.projects);
  const tasks = useTaskStore((state) => state.tasks);
  const addTask = useTaskStore((state) => state.addTask);
  const events = useCalendarStore((state) => state.events);
  const notes = useStudioStore((state) => state.notes);
  const addNote = useStudioStore((state) => state.addNote);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickKind, setQuickKind] = useState<QuickCaptureKind>("project-task");

  const liveProjects = projects.filter((project) => !project.deletedAt && project.status !== "archived");
  const pinnedProject = liveProjects
    .filter((project) => project.pinnedAt)
    .sort((a, b) => (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? ""))[0];
  const activeProject = pinnedProject ?? liveProjects.find((project) => project.status === "active");
  const openTasks = tasks.filter((task) => !task.deletedAt && !isTerminalTaskStatus(task.status));
  const overdueTasks = openTasks.filter((task) => isOverdue(task.dueDate));
  const dueTodayTasks = openTasks.filter((task) => isToday(task.dueDate));
  const recommendedTasks = useMemo(
    () =>
      [...openTasks]
        .sort((a, b) => taskFocusScore(b, activeProject?.id) - taskFocusScore(a, activeProject?.id) || (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"))
        .slice(0, 3),
    [activeProject?.id, openTasks],
  );
  const todayEvents = events.filter((event) => event.startDate === new Date().toISOString().slice(0, 10));
  const reviewDocs = notes.filter((note) => (note.docStatus ?? "active") === "review").slice(0, 5);

  const submitQuickCapture = () => {
    const title = quickTitle.trim();
    if (!title) return;

    if (quickKind === "doc") {
      addNote({
        title,
        body: `# ${title}\n\n`,
        docType: "general",
        docStatus: "draft",
        clientVisible: false,
        favorite: false,
        projectIds: activeProject ? [activeProject.id] : [],
        relatedNoteIds: [],
      });
    } else {
      addTask(defaultQuickTask(title, quickKind === "project-task" ? activeProject?.id : undefined));
    }

    setQuickTitle("");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="border-l-4 border-[var(--brand-primary)] pl-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-brand)]">Today</p>
            <h1 className="mt-1 text-2xl font-black text-[var(--text)] sm:text-3xl">Focus Workspace</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--text-muted)]">Today is for commitments and next actions. Projects hold outcomes, tasks move work, docs hold decisions, and calendar items reserve time.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_minmax(220px,1fr)_auto]">
            <Select value={quickKind} onChange={(event) => setQuickKind(event.target.value as QuickCaptureKind)}>
              <option value="project-task">Project task</option>
              <option value="todo">Personal todo</option>
              <option value="doc">Project doc</option>
            </Select>
            <Input value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitQuickCapture(); }} placeholder="Quick capture..." />
            <Button icon={<Plus size={16} />} onClick={submitQuickCapture} disabled={!quickTitle.trim()}>Capture</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <TodayMetric icon={<AlertTriangle size={16} />} label="Overdue" value={overdueTasks.length} />
            <TodayMetric icon={<CalendarDays size={16} />} label="Due Today" value={dueTodayTasks.length} />
            <TodayMetric icon={<BookOpen size={16} />} label="Docs Review" value={reviewDocs.length} />
          </div>
          <TodayPanel icon={<Target size={18} />} title="Next 3 Moves" helper="Recommended from due dates, priority, and pinned project.">
            {recommendedTasks.length ? recommendedTasks.map((task) => <TodayTaskRow key={task.id} task={task} projectName={projects.find((project) => project.id === task.projectId)?.name} />) : <EmptyToday text="No open work is waiting. Capture a next move when something appears." />}
          </TodayPanel>
          <TodayPanel icon={<CalendarDays size={18} />} title="Today’s Calendar" helper="Scheduled commitments belong here.">
            {todayEvents.length ? todayEvents.map((event) => <div key={event.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3"><p className="font-bold text-[var(--text)]">{event.title}</p><p className="text-xs font-semibold text-[var(--text-muted)]">{event.source === "google" ? "Google Calendar" : "Calendar"}</p></div>) : <EmptyToday text="Nothing scheduled today." />}
          </TodayPanel>
        </section>

        <aside className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--brand-primary)]"><Star size={16} /></span>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-[var(--text)]">Priority Project</h2>
                {activeProject ? (
                  <>
                    <p className="mt-1 truncate text-sm font-bold text-[var(--text)]">{activeProject.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{activeProject.description || "Pinned or most relevant active project."}</p>
                    <Link to={`/projects/${activeProject.id}`} className="mt-3 inline-flex text-sm font-black text-[var(--text-brand)] hover:underline">Open project</Link>
                  </>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">Pin or create a project to anchor today’s focus.</p>
                )}
              </div>
            </div>
          </Card>
          <TodayPanel icon={<BookOpen size={18} />} title="Docs Needing Review" helper="Planning, briefs, and handoff notes waiting for a decision.">
            {reviewDocs.length ? reviewDocs.map((note) => <Link key={note.id} to="/notes" className="block rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"><p className="truncate font-bold text-[var(--text)]">{note.title}</p><p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{note.docType ?? "general"}</p></Link>) : <EmptyToday text="No docs are marked Needs Review." />}
          </TodayPanel>
        </aside>
      </div>
    </div>
  );
}

function TodayMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
          <p className="mt-2 text-2xl font-black text-[var(--text)]">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--brand-primary)]">{icon}</span>
      </div>
    </Card>
  );
}

function TodayPanel({ icon, title, helper, children }: { icon: React.ReactNode; title: string; helper: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--brand-primary)]">{icon}</span>
        <div>
          <h2 className="font-black text-[var(--text)]">{title}</h2>
          <p className="text-xs font-semibold text-[var(--text-muted)]">{helper}</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}

function TodayTaskRow({ task, projectName }: { task: ReturnType<typeof useTaskStore.getState>["tasks"][number]; projectName?: string }) {
  return (
    <Link to={task.projectId ? `/projects/${task.projectId}` : "/todos"} className="block rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-[var(--text)]">{task.title}</p>
        <Badge tone={task.priority === "urgent" || task.priority === "high" ? "orange" : "slate"}>{task.priority}</Badge>
      </div>
      <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{projectName ?? "Personal todo"} · {dateLabel(task.dueDate, task.dueTime)}</p>
    </Link>
  );
}

function EmptyToday({ text }: { text: string }) {
  return <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-4 text-sm font-semibold text-[var(--text-muted)]">{text}</p>;
}

function taskFocusScore(task: ReturnType<typeof useTaskStore.getState>["tasks"][number], pinnedProjectId?: string) {
  let score = 0;
  if (task.projectId && task.projectId === pinnedProjectId) score += 30;
  if (task.priority === "urgent") score += 40;
  if (task.priority === "high") score += 25;
  if (isOverdue(task.dueDate)) score += 50;
  if (isToday(task.dueDate)) score += 35;
  return score;
}

function defaultQuickTask(title: string, projectId?: string): TaskInput {
  return {
    title,
    description: "",
    projectId,
    category: projectId ? "project" : "personal",
    priority: "medium",
    status: "not_started",
    startDate: "",
    startTime: "",
    dueDate: "",
    dueTime: "",
    reminder: "none",
    recurrence: "none",
  };
}
