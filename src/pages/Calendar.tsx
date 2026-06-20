import { PageHeader } from "../components/layout/PageHeader";
import { CalendarView } from "../components/calendar/CalendarView";
import { isTerminalTaskStatus } from "../config/taskOptions";
import { useCalendarStore } from "../store/calendarStore";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import { useMemo } from "react";

export function Calendar() {
  const { tasks, updateTask } = useTaskStore();
  const { projects } = useProjectStore();
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarStore();
  const calendarTasks = useMemo(() => {
    const visibleProjectIds = new Set(
      projects
        .filter((project) => !project.deletedAt && (project.status === "active" || project.status === "paused"))
        .map((project) => project.id),
    );

    return tasks.filter((task) => {
      if (task.deletedAt || isTerminalTaskStatus(task.status)) return false;
      if (!task.projectId) return true;
      return visibleProjectIds.has(task.projectId);
    });
  }, [projects, tasks]);

  return (
    <div className="space-y-4">
      <PageHeader title="Calendar" description="A monthly view for task due dates and local events. The integration layer is ready for Google Calendar sync later." />
      <CalendarView
        tasks={calendarTasks}
        events={events}
        onAddEvent={addEvent}
        onUpdateEvent={updateEvent}
        onDeleteEvent={deleteEvent}
        onUpdateTask={updateTask}
      />
    </div>
  );
}
