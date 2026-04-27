import { PageHeader } from "../components/layout/PageHeader";
import { CalendarView } from "../components/calendar/CalendarView";
import { useCalendarStore } from "../store/calendarStore";
import { useTaskStore } from "../store/taskStore";

export function Calendar() {
  const { tasks } = useTaskStore();
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarStore();

  return (
    <div className="space-y-4">
      <PageHeader title="Calendar" description="A monthly view for task due dates and local events. The integration layer is ready for Google Calendar sync later." />
      <CalendarView
        tasks={tasks.filter((task) => !task.deletedAt)}
        events={events}
        onAddEvent={addEvent}
        onUpdateEvent={updateEvent}
        onDeleteEvent={deleteEvent}
      />
    </div>
  );
}
