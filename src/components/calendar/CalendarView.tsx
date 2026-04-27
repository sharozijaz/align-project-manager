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
      <Card className="p-4">
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
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-400">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
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
              ? "!border-sky-300 !bg-sky-400/20 text-white shadow-[inset_0_0_0_1px_rgba(125,211,252,0.8)]"
              : today
                ? "!border-amber-300 !bg-amber-300/12 text-white shadow-[inset_0_0_0_1px_rgba(252,211,77,0.55)]"
                : "border-slate-700 bg-slate-950/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800/80";

            return (
              <button
                key={key}
                className={`min-h-24 rounded-md border p-2 text-left transition ${dayClass} ${inMonth ? "" : "opacity-45"}`}
                onClick={() => setSelectedDate(key)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`grid h-7 min-w-7 place-items-center rounded-full text-sm font-bold ${selected ? "bg-sky-300 text-slate-950" : today ? "bg-amber-300 text-slate-950" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {today ? <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-100">Today</span> : null}
                </div>
                <div className="mt-3 space-y-1 text-xs font-semibold">
                  {taskCount ? <p className="rounded bg-sky-300/15 px-2 py-1 text-sky-100">{taskCount} task{taskCount === 1 ? "" : "s"}</p> : null}
                  {eventCount ? <p className="rounded bg-purple-300/15 px-2 py-1 text-purple-100">{eventCount} event{eventCount === 1 ? "" : "s"}</p> : null}
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
            <div key={`task-${task.id}`} className="rounded-md border border-sky-300/25 bg-sky-300/10 p-3 text-sm text-sky-50">
              <p className="font-semibold">{task.title}</p>
              <p className="mt-1 text-xs text-sky-100/75">Task due</p>
            </div>
          ))}
          {selectedEvents.map((event) => (
            <div key={`event-${event.id}`} className="rounded-md border border-purple-300/25 bg-purple-300/10 p-3 text-sm text-purple-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="mt-1 text-xs text-purple-100/75">Local event</p>
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
