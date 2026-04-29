import { Bell, Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { getTaskPriorityOption, getTaskRecurrenceOption, getTaskReminderOption, getTaskStatusOption, isTerminalTaskStatus } from "../../config/taskOptions";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { OptionBadge } from "../ui/OptionBadge";
import { TaskForm } from "./TaskForm";
import { dateLabel } from "../../utils/date";
import { taskAccentClass, taskAccentStyle, taskDateTone } from "../../utils/taskVisuals";
import type { Project } from "../../types/project";
import type { Task, TaskInput } from "../../types/task";

export function TaskCard({
  task,
  project,
  projects,
  onUpdate,
  onDelete,
  onComplete,
}: {
  task: Task;
  project?: Project;
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card className={`p-4 ${taskAccentClass(task)}`} style={taskAccentStyle(task)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className={`font-semibold text-slate-950 ${isTerminalTaskStatus(task.status) ? "line-through opacity-60" : ""}`}>{task.title}</h3>
          {task.description ? <p className="mt-1 text-sm text-slate-500">{task.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <OptionBadge option={getTaskPriorityOption(task.priority)} />
            <OptionBadge option={getTaskStatusOption(task.status)} />
            <Badge>{project?.name ?? task.category}</Badge>
            <Badge tone={taskDateTone(task)}>{dateLabel(task.dueDate)}</Badge>
            {task.reminder !== "none" ? (
              <Badge>
                <Bell size={12} />
                {getTaskReminderOption(task.reminder).label}
              </Badge>
            ) : null}
            {task.recurrence && task.recurrence !== "none" ? <Badge>{getTaskRecurrenceOption(task.recurrence).label}</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button title="Mark complete" variant="secondary" className="px-3" onClick={() => onComplete(task.id)}>
            <Check size={16} />
          </Button>
          <Button title="Edit task" variant="secondary" className="px-3" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </Button>
          <Button title="Delete task" variant="danger" className="px-3" onClick={() => onDelete(task.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <Modal title="Edit task" open={editing} onClose={() => setEditing(false)}>
        <TaskForm
          projects={projects}
          initialTask={task}
          onSubmit={(input) => {
            onUpdate(task.id, input);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </Card>
  );
}
