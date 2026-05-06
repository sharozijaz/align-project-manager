import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { isTerminalTaskStatus } from "../../config/taskOptions";
import { dateLabel, isUpcoming } from "../../utils/date";
import { priorityTone } from "../../utils/taskVisuals";
import type { Project } from "../../types/project";
import type { Task } from "../../types/task";

interface UpcomingItem {
  id: string;
  title: string;
  date?: string;
  meta: string;
  priority: Task["priority"];
  href?: string;
  projectId?: string;
  kind: "task" | "project";
}

export function UpcomingTasks({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const upcomingTasks: UpcomingItem[] = tasks
    .filter((task) => !isTerminalTaskStatus(task.status) && isUpcoming(task.dueDate))
    .map((task) => ({
      id: task.id,
      title: task.title,
      date: task.dueDate,
      meta: task.category,
      priority: task.priority,
      projectId: task.projectId,
      kind: "task",
    }));

  const upcomingProjects: UpcomingItem[] = projects
    .filter((project) => project.status === "active" && !project.deletedAt && isUpcoming(project.dueDate))
    .map((project) => ({
      id: project.id,
      title: project.name,
      date: project.dueDate,
      meta: "Project deadline",
      priority: project.priority,
      href: `/projects/${project.id}`,
      projectId: project.id,
      kind: "project",
    }));

  const items = [...upcomingTasks, ...upcomingProjects]
    .sort((a, b) => (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31"))
    .slice(0, 6);
  const groupedItems = groupUpcomingByProject(items, projectById);

  return (
    <Card className="overflow-hidden p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Upcoming Deadlines</h2>
          <p className="mt-2 text-sm text-slate-500">Next tasks and project dates</p>
        </div>
        <CalendarClock className="text-slate-400" size={22} />
      </div>
      <div className="mt-6 space-y-3">
        {groupedItems.length ? (
          groupedItems.map((group) => (
            <section key={group.key} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-[var(--text)] sm:text-base">{group.project?.name ?? group.label}</h3>
                  <p className="truncate text-xs text-[var(--text-muted)]">{group.project?.description || (group.project ? `${group.project.area} project` : "Workspace deadlines")}</p>
                </div>
                <Badge tone={group.project?.status === "completed" ? "emerald" : group.project?.status === "paused" ? "amber" : "blue"}>{group.items.length}</Badge>
              </div>
              <div className="space-y-2 p-3">
                {group.items.map((item) => {
                  const content = (
                    <div className="min-w-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words font-semibold text-slate-950">{item.title}</h4>
                          <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                        </div>
                        <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">{dateLabel(item.date)}</p>
                    </div>
                  );

                  return item.href ? (
                    <Link key={item.id} to={item.href} className="block">
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id}>{content}</div>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">
            No upcoming deadlines yet.
          </div>
        )}
      </div>
    </Card>
  );
}

function groupUpcomingByProject(items: UpcomingItem[], projectById: Map<string, Project>) {
  const groups: { key: string; label: string; project?: Project; items: UpcomingItem[] }[] = [];
  const groupByKey = new Map<string, { key: string; label: string; project?: Project; items: UpcomingItem[] }>();

  items.forEach((item) => {
    const project = item.projectId ? projectById.get(item.projectId) : undefined;
    const key = project?.id ?? `workspace:${item.meta}`;
    let group = groupByKey.get(key);

    if (!group) {
      group = {
        key,
        label: project?.name ?? item.meta,
        project,
        items: [],
      };
      groupByKey.set(key, group);
      groups.push(group);
    }

    group.items.push(item);
  });

  return groups;
}
