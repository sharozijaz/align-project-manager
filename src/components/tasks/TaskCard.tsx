import { Bell } from "lucide-react";
import { getTaskPriorityOption, getTaskRecurrenceOption, getTaskReminderOption, getTaskStatusOption, isTerminalTaskStatus } from "../../config/taskOptions";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { OptionBadge } from "../ui/OptionBadge";
import { TaskOverflowMenu } from "./TaskOverflowMenu";
import { dateLabel, durationLabel, startDateLabel } from "../../utils/date";
import { taskAccentClass, taskAccentStyle, taskDateTone } from "../../utils/taskVisuals";
import type { Project } from "../../types/project";
import type { Task, TaskInput } from "../../types/task";
import type { AssigneeOption } from "../../types/collaboration";
import type { ProjectTaskFieldVisibility } from "../projects/projectTaskFields";

export function TaskCard({
  task,
  project,
  onDelete,
  onOpen,
  showProjectBadge = true,
  visibleFields,
}: {
  task: Task;
  project?: Project;
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onOpen?: (task: Task) => void;
  showProjectBadge?: boolean;
  assigneeOptions?: AssigneeOption[];
  visibleFields?: Partial<ProjectTaskFieldVisibility>;
}) {
  return (
    <Card className={`group p-4 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:shadow-[var(--shadow-md)] ${taskAccentClass(task)}`} style={taskAccentStyle(task)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            className={`max-w-full text-left font-bold text-[var(--text)] transition hover:text-[var(--text-brand)] ${isTerminalTaskStatus(task.status) ? "line-through opacity-60" : ""}`}
            onClick={() => onOpen?.(task)}
          >
            {task.title}
          </button>
          {visibleFields?.notes !== false && task.description ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">{task.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleFields?.priority !== false ? <OptionBadge option={getTaskPriorityOption(task.priority)} /> : null}
            {visibleFields?.status !== false ? <OptionBadge option={getTaskStatusOption(task.status)} /> : null}
            {visibleFields?.project !== false && showProjectBadge ? <Badge tone={project ? "purple" : "slate"}>{project?.name ?? task.category}</Badge> : null}
            {visibleFields?.assignee !== false ? <Badge tone={task.assigneeEmail ? "blue" : "slate"}>{task.assigneeEmail || "Unassigned"}</Badge> : null}
            {visibleFields?.start !== false && task.startDate ? <Badge>{startDateLabel(task.startDate, task.startTime)}</Badge> : null}
            {visibleFields?.due !== false ? <Badge tone={taskDateTone(task)}>{dateLabel(task.dueDate, task.dueTime)}</Badge> : null}
            {task.startDate ? <Badge>{durationLabel(task.startDate, task.dueDate)}</Badge> : null}
            {task.reminder !== "none" ? (
              <Badge>
                <Bell size={12} />
                {getTaskReminderOption(task.reminder).label}
              </Badge>
            ) : null}
            {task.recurrence && task.recurrence !== "none" ? <Badge>{getTaskRecurrenceOption(task.recurrence).label}</Badge> : null}
          </div>
        </div>
        {visibleFields?.actions === false ? null : (
          <div className="flex shrink-0 gap-1.5 opacity-80 transition group-hover:opacity-100">
            <TaskOverflowMenu task={task} onOpen={onOpen} onDelete={onDelete} />
          </div>
        )}
      </div>
    </Card>
  );
}
