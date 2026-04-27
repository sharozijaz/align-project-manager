import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
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
}

export function UpcomingTasks({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const upcomingTasks: UpcomingItem[] = tasks
    .filter((task) => task.status !== "completed" && isUpcoming(task.dueDate))
    .map((task) => ({
      id: task.id,
      title: task.title,
      date: task.dueDate,
      meta: projects.find((project) => project.id === task.projectId)?.name ?? task.category,
      priority: task.priority,
    }));

  const upcomingProjects: UpcomingItem[] = projects
    .filter((project) => project.status !== "completed" && isUpcoming(project.dueDate))
    .map((project) => ({
      id: project.id,
      title: project.name,
      date: project.dueDate,
      meta: "Project deadline",
      priority: project.priority,
      href: `/projects/${project.id}`,
    }));

  const items = [...upcomingTasks, ...upcomingProjects]
    .sort((a, b) => (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31"))
    .slice(0, 6);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Upcoming Deadlines</h2>
          <p className="mt-2 text-sm text-slate-500">Next tasks and project dates</p>
        </div>
        <CalendarClock className="text-slate-400" size={22} />
      </div>
      <div className="mt-6 space-y-3">
        {items.length ? (
          items.map((item) => {
            const content = (
              <div className="rounded-lg border border-slate-700 bg-slate-950/55 p-4 transition hover:border-slate-500 hover:bg-slate-800/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
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
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">
            No upcoming deadlines yet.
          </div>
        )}
      </div>
    </Card>
  );
}
