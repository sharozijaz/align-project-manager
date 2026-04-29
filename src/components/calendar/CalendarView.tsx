import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { addMonths, format, isSameMonth, isToday as isDateToday } from "date-fns";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { CalendarEventModal } from "./CalendarEventModal";
import { monthGrid, sameDay } from "../../utils/date";
import type { CalendarEvent, CalendarEventInput } from "../../types/calendar";
import type { Task } from "../../types/task";

export function CalendarView({
  tasks,
  events,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}: {
  tasks: Task[];
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEventInput) => void;
  onUpdateEvent: (id: string, event: Partial<CalendarEventInput>) => void;
  onDeleteEvent: (id: string) => void;
}) {
  const [visibleDate, setVisibleDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const days = monthGrid(visibleDate);
  const selectedTasks = tasks.filter((task) => task.dueDate === selectedDate);
  const selectedEvents = events.filter((event) => event.startDate === selectedDate);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="p-3 sm:p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950">{format(visibleDate, "MMMM yyyy")}</h2>
          <div className="flex gap-2">
            <Button variant="secondary" className="px-3" onClick={() => setVisibleDate(addMonths(visibleDate, -1))}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="secondary" className="px-3" onClick={() => setVisibleDate(addMonths(visibleDate, 1))}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-400 sm:gap-2 sm:text-xs">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasks.filter((task) => task.dueDate && sameDay(task.dueDate, day));
            const dayEvents = events.filter((event) => sameDay(event.startDate, day));
            const taskCount = dayTasks.length;
            const eventCount = dayEvents.length;
            const selected = key === selectedDate;
            const today = isDateToday(day);
            const inMonth = isSameMonth(day, visibleDate);
            const dayClass = selected
              ? "border-[var(--brand-primary)] bg-[var(--calendar-selected-bg)] text-[var(--calendar-selected-text)] shadow-[inset_0_0_0_1px_var(--brand-primary)]"
              : today
                ? "border-[var(--warning)] bg-[var(--calendar-today-bg)] text-[var(--text)]"
                : "border-[var(--border)] bg-[var(--calendar-cell-bg)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--calendar-cell-hover)]";

            return (
              <button
                key={key}
                className={`min-h-20 rounded-md border p-1.5 text-left transition sm:min-h-24 sm:p-2 ${dayClass} ${inMonth ? "" : "opacity-45"}`}
                onClick={() => setSelectedDate(key)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`grid h-6 min-w-6 place-items-center rounded-full text-sm font-bold sm:h-7 sm:min-w-7 ${selected ? "align-gradient text-white" : today ? "bg-[var(--priority-low-bg)] text-[var(--priority-low-text)]" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {today ? <span className="hidden rounded-full bg-[var(--priority-low-bg)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--priority-low-text)] sm:inline">Today</span> : null}
                </div>
                <div className="mt-3 space-y-1 text-[10px] font-semibold sm:text-xs">
                  {taskCount ? <p className="truncate rounded bg-[var(--status-in-progress-bg)] px-1.5 py-1 text-center text-[var(--status-in-progress-text)] sm:px-2 sm:text-left">{taskCount}<span className="hidden sm:inline"> task{taskCount === 1 ? "" : "s"}</span></p> : null}
                  {eventCount ? <p className="truncate rounded bg-[var(--priority-urgent-bg)] px-1.5 py-1 text-center text-[var(--priority-urgent-text)] sm:px-2 sm:text-left">{eventCount}<span className="hidden sm:inline"> event{eventCount === 1 ? "" : "s"}</span></p> : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-950">{format(new Date(`${selectedDate}T00:00:00`), "MMM d")}</h2>
            <p className="text-sm text-slate-500">Scheduled work</p>
          </div>
          <Button
            className="px-3"
            onClick={() => {
              setEditingEvent(undefined);
              setModalOpen(true);
            }}
          >
            <Plus size={16} />
          </Button>
        </div>
        <div className="mt-5 space-y-3">
          {selectedTasks.map((task) => (
            <div key={`task-${task.id}`} className="rounded-md border border-[var(--border)] bg-[var(--status-in-progress-bg)] p-3 text-sm text-[var(--status-in-progress-text)]">
              <p className="font-semibold">{task.title}</p>
              <p className="mt-1 text-xs opacity-75">Task due</p>
            </div>
          ))}
          {selectedEvents.map((event) => (
            <div key={`event-${event.id}`} className="rounded-md border border-[var(--border)] bg-[var(--priority-urgent-bg)] p-3 text-sm text-[var(--priority-urgent-text)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="mt-1 text-xs opacity-75">Local event</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    title="Edit event"
                    variant="secondary"
                    className="min-h-8 px-2"
                    onClick={() => {
                      setEditingEvent(event);
                      setModalOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    title="Delete event"
                    variant="danger"
                    className="min-h-8 px-2"
                    onClick={() => {
                      if (window.confirm(`Delete "${event.title}" from your local calendar?`)) {
                        onDeleteEvent(event.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!selectedTasks.length && !selectedEvents.length ? <p className="text-sm text-slate-500">No items on this date.</p> : null}
        </div>
      </Card>
      <CalendarEventModal
        open={modalOpen}
        date={selectedDate}
        initialEvent={editingEvent}
        onClose={() => {
          setModalOpen(false);
          setEditingEvent(undefined);
        }}
        onSubmit={(event) => {
          if (editingEvent) {
            onUpdateEvent(editingEvent.id, event);
          } else {
            onAddEvent(event);
          }
        }}
      />
    </div>
  );
}
