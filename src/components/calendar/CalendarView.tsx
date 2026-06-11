import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  List,
  Pencil,
  Plus,
  CalendarPlus,
  Trash2,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isToday as isDateToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus } from "../../config/taskOptions";
import type { CalendarEvent, CalendarEventInput } from "../../types/calendar";
import type { Task } from "../../types/task";
import { dateLabel, monthGrid, sameDay, todayKey } from "../../utils/date";
import { getClampedDragPreviewPosition, getDragPreviewAnchor } from "../../utils/dragPreview";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useConfirm } from "../ui/ConfirmProvider";
import { OptionBadge } from "../ui/OptionBadge";
import { CalendarEventModal } from "./CalendarEventModal";

type CalendarMode = "month" | "week" | "agenda";
type CalendarItem = { id: string; date: string; kind: "task"; task: Task } | { id: string; date: string; kind: "event"; event: CalendarEvent };
type PlannerDragState = {
  kind: CalendarItem["kind"];
  itemId: string;
  title: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  previewOffsetX: number;
  previewOffsetY: number;
  active: boolean;
};

export function CalendarView({
  tasks,
  events,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onUpdateTask,
}: {
  tasks: Task[];
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEventInput) => void;
  onUpdateEvent: (id: string, event: Partial<CalendarEventInput>) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
}) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [visibleDate, setVisibleDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [plannerDrag, setPlannerDrag] = useState<PlannerDragState | null>(null);
  const [plannerDropDate, setPlannerDropDate] = useState<string | null>(null);
  const [unscheduleDropActive, setUnscheduleDropActive] = useState(false);
  const plannerDragRef = useRef<PlannerDragState | null>(null);
  const plannerDropDateRef = useRef<string | null>(null);
  const unscheduleDropActiveRef = useRef(false);
  const days = useMemo(() => monthGrid(visibleDate), [visibleDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);
  const today = todayKey();
  const selectedWeekStart = useMemo(() => format(startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 }), "yyyy-MM-dd"), [selectedDate]);
  const visibleMonth = useMemo(() => format(visibleDate, "yyyy-MM"), [visibleDate]);
  const allItems = useMemo(() => getCalendarItems(tasks, events), [events, tasks]);
  const selectedItems = useMemo(() => itemsForDate(allItems, selectedDate), [allItems, selectedDate]);
  const todayItems = useMemo(() => itemsForDate(allItems, today), [allItems, today]);
  const overdueTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.dueDate && isBefore(parseISO(task.dueDate), parseISO(today)) && !isTerminalTaskStatus(task.status))
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
    [tasks, today],
  );
  const thisWeekItems = useMemo(() => {
    const weekStart = startOfWeek(parseISO(today), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(parseISO(today), { weekStartsOn: 1 });
    return allItems.filter((item) => {
      const date = parseISO(item.date);
      return !isBefore(date, weekStart) && !isAfter(date, weekEnd);
    });
  }, [allItems, today]);
  const agendaGroups = useMemo(() => getAgendaGroups(allItems, today), [allItems, today]);
  const plannerTasks = useMemo(() => getPlannerTasks(tasks, selectedWeekStart, visibleMonth), [selectedWeekStart, tasks, visibleMonth]);
  const label = mode === "week" ? `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d, yyyy")}` : format(visibleDate, "MMMM yyyy");

  useEffect(() => {
    plannerDragRef.current = plannerDrag;
  }, [plannerDrag]);

  useEffect(() => {
    plannerDropDateRef.current = plannerDropDate;
  }, [plannerDropDate]);

  useEffect(() => {
    unscheduleDropActiveRef.current = unscheduleDropActive;
  }, [unscheduleDropActive]);

  useEffect(() => {
    if (!plannerDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      setPlannerDrag((current) => {
        if (!current) return current;
        const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
        const active = current.active || distance > 8;

        if (active) {
          const nextDropDate = getCalendarDropDate(event.clientX, event.clientY);
          const nextUnscheduleActive = Boolean(getCalendarUnscheduleDropTarget(event.clientX, event.clientY));

          plannerDropDateRef.current = nextDropDate;
          unscheduleDropActiveRef.current = nextUnscheduleActive;
          setPlannerDropDate(nextDropDate);
          setUnscheduleDropActive(nextUnscheduleActive);
        }

        return { ...current, x: event.clientX, y: event.clientY, active };
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const current = plannerDragRef.current;
      const task = current?.kind === "task" ? tasks.find((item) => item.id === current.itemId) : undefined;
      const calendarEvent = current?.kind === "event" ? events.find((item) => item.id === current.itemId) : undefined;
      const dropDate = getCalendarDropDate(event.clientX, event.clientY) ?? plannerDropDateRef.current;
      const shouldUnschedule = Boolean(getCalendarUnscheduleDropTarget(event.clientX, event.clientY)) || unscheduleDropActiveRef.current;

      if (current?.active && task) {
        if (shouldUnschedule && task.dueDate) {
          unscheduleTask(task.id);
        } else if (dropDate) {
          moveTaskToDate(task, dropDate);
        }
      } else if (current?.active && calendarEvent && dropDate && !shouldUnschedule) {
        moveEventToDate(calendarEvent, dropDate);
      }

      setPlannerDrag(null);
      setPlannerDropDate(null);
      setUnscheduleDropActive(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [events, plannerDrag, tasks]);

  const openNewEvent = (date = selectedDate) => {
    setSelectedDate(date);
    setEditingEvent(undefined);
    setModalOpen(true);
  };

  const goToday = () => {
    const next = new Date();
    setVisibleDate(next);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  const moveVisibleDate = (direction: -1 | 1) => {
    if (mode === "month" || mode === "agenda") {
      setVisibleDate((current) => addMonths(current, direction));
      return;
    }

    const nextDate = addWeeks(parseISO(selectedDate), direction);
    setSelectedDate(format(nextDate, "yyyy-MM-dd"));
    setVisibleDate(nextDate);
  };

  const moveTaskToDate = (task: Task, nextDueDate: string) => {
    if (!task.dueDate) {
      onUpdateTask(task.id, {
        dueDate: nextDueDate,
        plannedMonth: undefined,
        plannedWeekStart: undefined,
      });
      setSelectedDate(nextDueDate);
      return;
    }
    if (task.dueDate === nextDueDate) return;

    const dayDelta = differenceInCalendarDays(parseISO(nextDueDate), parseISO(task.dueDate));
    const nextStartDate = task.startDate ? format(addDays(parseISO(task.startDate), dayDelta), "yyyy-MM-dd") : undefined;

    onUpdateTask(task.id, {
      dueDate: nextDueDate,
      plannedMonth: undefined,
      plannedWeekStart: undefined,
      ...(nextStartDate ? { startDate: nextStartDate } : {}),
    });
    setSelectedDate(nextDueDate);
  };

  const unscheduleTask = (taskId: string) => {
    onUpdateTask(taskId, {
      startDate: undefined,
      startTime: undefined,
      dueDate: undefined,
      dueTime: undefined,
      plannedMonth: format(parseISO(selectedDate), "yyyy-MM"),
      plannedWeekStart: undefined,
    });
  };

  const moveEventToDate = (event: CalendarEvent, nextStartDate: string) => {
    if (event.source === "google" || event.startDate === nextStartDate) return;

    const dayDelta = differenceInCalendarDays(parseISO(nextStartDate), parseISO(event.startDate));
    const nextEndDate = event.endDate ? format(addDays(parseISO(event.endDate), dayDelta), "yyyy-MM-dd") : undefined;

    onUpdateEvent(event.id, {
      startDate: nextStartDate,
      ...(nextEndDate ? { endDate: nextEndDate } : {}),
    });
    setSelectedDate(nextStartDate);
  };

  const startTaskDrag = (task: Task, event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    const anchor = getDragPreviewAnchor(event.currentTarget, event.clientX, event.clientY, 320, 120);
    setPlannerDrag({
      kind: "task",
      itemId: task.id,
      title: task.title,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      previewOffsetX: anchor.offsetX,
      previewOffsetY: anchor.offsetY,
      active: false,
    });
  };

  const startEventDrag = (calendarEvent: CalendarEvent, event: ReactPointerEvent<HTMLElement>) => {
    if (calendarEvent.source === "google") return;
    event.preventDefault();
    const anchor = getDragPreviewAnchor(event.currentTarget, event.clientX, event.clientY, 320, 120);
    setPlannerDrag({
      kind: "event",
      itemId: calendarEvent.id,
      title: calendarEvent.title,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      previewOffsetX: anchor.offsetX,
      previewOffsetY: anchor.offsetY,
      active: false,
    });
  };

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="min-w-0 overflow-hidden p-0">
        <CalendarToolbar
          mode={mode}
          label={label}
          onModeChange={setMode}
          onToday={goToday}
          onPrevious={() => moveVisibleDate(-1)}
          onNext={() => moveVisibleDate(1)}
        />
        <div className="p-3 sm:p-4">
          {mode === "month" ? (
            <MonthView
              days={days}
              visibleDate={visibleDate}
              selectedDate={selectedDate}
              items={allItems}
              plannerDropDate={plannerDropDate}
              plannerDragging={Boolean(plannerDrag?.active)}
              onSelectDate={setSelectedDate}
              onStartTaskDrag={startTaskDrag}
              onStartEventDrag={startEventDrag}
            />
          ) : mode === "week" ? (
            <WeekView
              days={weekDays}
              selectedDate={selectedDate}
              items={allItems}
              plannerDropDate={plannerDropDate}
              plannerDragging={Boolean(plannerDrag?.active)}
              onSelectDate={setSelectedDate}
              onAddEvent={openNewEvent}
              onStartTaskDrag={startTaskDrag}
              onStartEventDrag={startEventDrag}
            />
          ) : (
            <AgendaView groups={agendaGroups} onSelectDate={setSelectedDate} />
          )}
        </div>
      </Card>
      <PlanningSidebar
        selectedDate={selectedDate}
        selectedItems={selectedItems}
        plannerTasks={plannerTasks}
        mode={mode}
        visibleMonth={visibleMonth}
        selectedWeekStart={selectedWeekStart}
        unscheduleDropActive={unscheduleDropActive}
        todayItems={todayItems}
        overdueTasks={overdueTasks}
        thisWeekCount={thisWeekItems.length}
        onPlanThisMonth={(task) => onUpdateTask(task.id, { plannedMonth: visibleMonth, plannedWeekStart: undefined })}
        onPlanThisWeek={(task) => onUpdateTask(task.id, { plannedMonth: visibleMonth, plannedWeekStart: selectedWeekStart })}
        onDropScheduledTask={unscheduleTask}
        onUnscheduleDropActiveChange={setUnscheduleDropActive}
        onStartTaskDrag={startTaskDrag}
        onAddEvent={() => openNewEvent(selectedDate)}
        onEditEvent={(event) => {
          setEditingEvent(event);
          setSelectedDate(event.startDate);
          setModalOpen(true);
        }}
        onDeleteEvent={onDeleteEvent}
      />
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
      {plannerDrag?.active ? (
        <PlannerTaskPreview title={plannerDrag.title} kind={plannerDrag.kind} x={plannerDrag.x} y={plannerDrag.y} offsetX={plannerDrag.previewOffsetX} offsetY={plannerDrag.previewOffsetY} />
      ) : null}
    </div>
  );
}

function CalendarToolbar({
  mode,
  label,
  onModeChange,
  onToday,
  onPrevious,
  onNext,
}: {
  mode: CalendarMode;
  label: string;
  onModeChange: (mode: CalendarMode) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const modes = [
    { value: "month" as const, label: "Month", icon: CalendarDays },
    { value: "week" as const, label: "Week", icon: CalendarRange },
    { value: "agenda" as const, label: "Agenda", icon: List },
  ];

  return (
    <div className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:px-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold text-[var(--text)]">{label}</h2>
        <p className="text-sm text-[var(--text-muted)]">Plan deadlines, local events, and the week ahead.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-self-end">
        <div className="align-tab-list sm:w-auto">
          {modes.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" className="align-tab" data-active={mode === value} onClick={() => onModeChange(value)}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-3" onClick={onPrevious} title="Previous">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" className="px-3" onClick={onToday}>
            Today
          </Button>
          <Button variant="secondary" className="px-3" onClick={onNext} title="Next">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MonthView({
  days,
  visibleDate,
  selectedDate,
  items,
  plannerDropDate,
  plannerDragging,
  onSelectDate,
  onStartTaskDrag,
  onStartEventDrag,
}: {
  days: Date[];
  visibleDate: Date;
  selectedDate: string;
  items: CalendarItem[];
  plannerDropDate: string | null;
  plannerDragging: boolean;
  onSelectDate: (date: string) => void;
  onStartTaskDrag: (task: Task, event: ReactPointerEvent<HTMLElement>) => void;
  onStartEventDrag: (event: CalendarEvent, pointerEvent: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--text-soft)] sm:gap-2 sm:text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = itemsForDate(items, key);
          const selected = key === selectedDate;
          const today = isDateToday(day);
          const inMonth = isSameMonth(day, visibleDate);

          return (
            <CalendarDayButton
              key={key}
              date={day}
              selected={selected}
              today={today}
              muted={!inMonth}
              items={dayItems}
              dropTarget={plannerDragging && plannerDropDate === key}
              className="min-h-[112px] 2xl:min-h-[132px]"
              onSelect={() => onSelectDate(key)}
              onStartTaskDrag={onStartTaskDrag}
              onStartEventDrag={onStartEventDrag}
            />
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  days,
  selectedDate,
  items,
  plannerDropDate,
  plannerDragging,
  onSelectDate,
  onAddEvent,
  onStartTaskDrag,
  onStartEventDrag,
}: {
  days: Date[];
  selectedDate: string;
  items: CalendarItem[];
  plannerDropDate: string | null;
  plannerDragging: boolean;
  onSelectDate: (date: string) => void;
  onAddEvent: (date: string) => void;
  onStartTaskDrag: (task: Task, event: ReactPointerEvent<HTMLElement>) => void;
  onStartEventDrag: (event: CalendarEvent, pointerEvent: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <div className="grid min-h-[520px] min-w-0 gap-2 md:grid-cols-7">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayItems = itemsForDate(items, key);
        const selected = selectedDate === key;
        const draggingOver = plannerDragging && plannerDropDate === key;

        return (
          <section
            key={key}
            data-calendar-drop-date={key}
            className={`flex min-h-[180px] flex-col rounded-[var(--radius-md)] border bg-[var(--calendar-cell-bg)] transition ${
              draggingOver
                ? "border-[var(--brand-primary)] bg-[var(--calendar-selected-bg)] shadow-[inset_0_0_0_1px_var(--brand-primary),var(--shadow-sm)]"
                : selected
                  ? "border-[var(--brand-primary)] shadow-[inset_0_0_0_1px_var(--brand-primary)]"
                  : "border-[var(--border)]"
            }`}
            onClick={() => onSelectDate(key)}
          >
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] p-3">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--text-soft)]">{format(day, "EEE")}</p>
                <p className="mt-1 text-xl font-bold text-[var(--text)]">{format(day, "d")}</p>
              </div>
              {isDateToday(day) ? <Badge tone="emerald">Today</Badge> : null}
            </div>
            <div className="grid flex-1 content-start gap-2 p-3">
              {dayItems.slice(0, 5).map((item) => (
                <CalendarItemChip
                  key={item.id}
                  item={item}
                  draggable={item.kind === "task" || (item.kind === "event" && item.event.source === "local")}
                  onPointerDown={
                    item.kind === "task"
                      ? (event) => onStartTaskDrag(item.task, event)
                      : item.event.source === "local"
                        ? (event) => onStartEventDrag(item.event, event)
                        : undefined
                  }
                />
              ))}
              {dayItems.length > 5 ? <p className="text-xs font-bold text-[var(--text-soft)]">+{dayItems.length - 5} more</p> : null}
              {!dayItems.length ? <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-3 text-center text-xs text-[var(--text-soft)]">Open</p> : null}
            </div>
            <button
              type="button"
              className="mx-3 mb-3 min-h-8 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--brand-primary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              onClick={(event) => {
                event.stopPropagation();
                onAddEvent(key);
              }}
            >
              + Event
            </button>
          </section>
        );
      })}
    </div>
  );
}

function AgendaView({ groups, onSelectDate }: { groups: Array<{ date: string; items: CalendarItem[] }>; onSelectDate: (date: string) => void }) {
  if (!groups.length) {
    return <EmptyPanel title="No upcoming calendar work" description="Tasks with due dates and local events will appear here." />;
  }

  return (
    <div className="grid gap-3">
      {groups.map((group) => (
        <section key={group.date} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition hover:bg-[var(--surface-hover)]"
            onClick={() => onSelectDate(group.date)}
          >
            <div>
              <h3 className="font-bold text-[var(--text)]">{format(parseISO(group.date), "EEEE, MMM d")}</h3>
              <p className="text-sm text-[var(--text-muted)]">{group.items.length} scheduled</p>
            </div>
            {group.date === todayKey() ? <Badge tone="emerald">Today</Badge> : null}
          </button>
          <div className="grid gap-2 p-3">
            {group.items.map((item) => (
              <CalendarItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PlanningSidebar({
  selectedDate,
  selectedItems,
  plannerTasks,
  mode,
  visibleMonth,
  selectedWeekStart,
  unscheduleDropActive,
  todayItems,
  overdueTasks,
  thisWeekCount,
  onPlanThisMonth,
  onPlanThisWeek,
  onDropScheduledTask,
  onUnscheduleDropActiveChange,
  onStartTaskDrag,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}: {
  selectedDate: string;
  selectedItems: CalendarItem[];
  plannerTasks: Task[];
  mode: CalendarMode;
  visibleMonth: string;
  selectedWeekStart: string;
  unscheduleDropActive: boolean;
  todayItems: CalendarItem[];
  overdueTasks: Task[];
  thisWeekCount: number;
  onPlanThisMonth: (task: Task) => void;
  onPlanThisWeek: (task: Task) => void;
  onDropScheduledTask: (taskId: string) => void;
  onUnscheduleDropActiveChange: (active: boolean) => void;
  onStartTaskDrag: (task: Task, event: ReactPointerEvent<HTMLElement>) => void;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}) {
  const selectedTasks = selectedItems.filter((item) => item.kind === "task").length;
  const selectedEvents = selectedItems.filter((item) => item.kind === "event").length;
  const planningTitle = mode === "month" ? "This Month" : mode === "week" ? "Plan This Week" : "Plan This Work";
  const planningDescription =
    mode === "month"
      ? "Hold work for the month, then drag onto a day when ready."
      : "Drag onto Month or Week. Drop scheduled tasks here to unschedule.";
  const emptyPlanningDescription =
    mode === "month" ? "Tasks without due dates can be held here as monthly intentions." : "Tasks without due dates will appear here for planning.";

  return (
    <aside className="grid min-w-0 gap-4 xl:content-start">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-[var(--text)]">{format(parseISO(selectedDate), "MMM d")}</h2>
            <p className="text-sm text-[var(--text-muted)]">Selected day</p>
          </div>
          <Button className="px-3" onClick={onAddEvent}>
            <Plus size={16} />
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniStat label="Tasks" value={selectedTasks} />
          <MiniStat label="Events" value={selectedEvents} />
        </div>
        <div className="mt-4 grid gap-2">
          {selectedItems.map((item) => (
            <CalendarItemRow
              key={item.id}
              item={item}
              actions={
                item.kind === "event" ? (
                  <EventActions event={item.event} onEdit={onEditEvent} onDelete={onDeleteEvent} />
                ) : null
              }
            />
          ))}
          {!selectedItems.length ? <EmptyPanel title="No items" description="Add a local event or pick a day with due tasks." compact /> : null}
        </div>
      </Card>
      <Card
        data-calendar-unschedule-drop
        className={`p-4 transition ${
          unscheduleDropActive
            ? "border-[var(--brand-primary)] bg-[var(--calendar-selected-bg)] shadow-[inset_0_0_0_1px_var(--brand-primary),var(--shadow-sm)]"
            : ""
        }`}
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes("text/plain")) return;
          onUnscheduleDropActiveChange(true);
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("text/plain")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          onUnscheduleDropActiveChange(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            onUnscheduleDropActiveChange(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          const taskId = event.dataTransfer.getData("text/plain");
          if (taskId) {
            onDropScheduledTask(taskId);
          }
          onUnscheduleDropActiveChange(false);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-[var(--text)]">{planningTitle}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{planningDescription}</p>
          </div>
          <Badge tone="blue">{plannerTasks.length}</Badge>
        </div>
        {unscheduleDropActive ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--brand-primary)] bg-[var(--accent-soft)] p-3 text-center text-xs font-bold text-[var(--brand-primary)]">
            Remove date and return to planning
          </div>
        ) : null}
        <div className="mt-4 grid gap-2">
          {plannerTasks.slice(0, 8).map((task) => (
            <PlannerTaskCard
              key={task.id}
              task={task}
              mode={mode}
              visibleMonth={visibleMonth}
              selectedWeekStart={selectedWeekStart}
              onPlanThisMonth={onPlanThisMonth}
              onPlanThisWeek={onPlanThisWeek}
              onPointerDown={(event) => onStartTaskDrag(task, event)}
            />
          ))}
          {plannerTasks.length > 8 ? <p className="text-xs font-bold text-[var(--text-soft)]">+{plannerTasks.length - 8} more planning items</p> : null}
          {!plannerTasks.length ? <EmptyPanel title="No planning items" description={emptyPlanningDescription} compact /> : null}
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="font-bold text-[var(--text)]">Planning Pulse</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 xl:grid-cols-1">
          <MiniStat label="Today" value={todayItems.length} />
          <MiniStat label="Overdue" value={overdueTasks.length} tone="danger" />
          <MiniStat label="This week" value={thisWeekCount} />
        </div>
      </Card>
    </aside>
  );
}

function CalendarDayButton({
  date,
  selected,
  today,
  muted,
  items,
  dropTarget,
  className,
  onSelect,
  onStartTaskDrag,
  onStartEventDrag,
}: {
  date: Date;
  selected: boolean;
  today: boolean;
  muted: boolean;
  items: CalendarItem[];
  dropTarget: boolean;
  className?: string;
  onSelect: () => void;
  onStartTaskDrag: (task: Task, event: ReactPointerEvent<HTMLElement>) => void;
  onStartEventDrag: (event: CalendarEvent, pointerEvent: ReactPointerEvent<HTMLElement>) => void;
}) {
  const key = format(date, "yyyy-MM-dd");
  const dayClass = dropTarget
    ? "border-[var(--brand-primary)] bg-[var(--calendar-selected-bg)] text-[var(--calendar-selected-text)] shadow-[inset_0_0_0_2px_var(--brand-primary)]"
    : selected
    ? "border-[var(--brand-primary)] bg-[var(--calendar-selected-bg)] text-[var(--calendar-selected-text)] shadow-[inset_0_0_0_1px_var(--brand-primary)]"
    : today
      ? "border-[var(--warning)] bg-[var(--calendar-today-bg)] text-[var(--text)]"
      : "border-[var(--border)] bg-[var(--calendar-cell-bg)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--calendar-cell-hover)]";

  return (
    <button
      type="button"
      data-calendar-drop-date={key}
      className={`min-w-0 rounded-[var(--radius-sm)] border p-2 text-left transition hover:-translate-y-px ${dayClass} ${muted ? "opacity-45" : ""} ${className ?? ""}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex min-h-7 min-w-7 items-center justify-center rounded-[var(--radius-sm)] px-1.5 text-sm font-bold ${
            selected
              ? "border border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_14%,transparent)] text-[var(--text)]"
              : today
                ? "bg-[var(--priority-low-bg)] text-[var(--priority-low-text)]"
                : "text-[var(--text)]"
          }`}
        >
          {format(date, "d")}
        </span>
        {today ? <Badge tone="emerald">Today</Badge> : null}
      </div>
      <div className="mt-3 grid gap-1.5">
        {items.slice(0, 3).map((item) => (
          <CalendarItemChip
            key={item.id}
            item={item}
            draggable={item.kind === "task" || (item.kind === "event" && item.event.source === "local")}
            onPointerDown={
              item.kind === "task"
                ? (event) => onStartTaskDrag(item.task, event)
                : item.event.source === "local"
                  ? (event) => onStartEventDrag(item.event, event)
                  : undefined
            }
          />
        ))}
        {items.length > 3 ? <p className="truncate text-xs font-bold text-[var(--text-soft)]">+{items.length - 3} more</p> : null}
        {dropTarget ? <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--brand-primary)] bg-[var(--accent-soft)] p-2 text-center text-xs font-bold text-[var(--brand-primary)]">Schedule here</p> : null}
      </div>
    </button>
  );
}

function CalendarItemChip({
  item,
  draggable = false,
  dragging = false,
  onPointerDown,
}: {
  item: CalendarItem;
  draggable?: boolean;
  dragging?: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  if (item.kind === "event") {
    return (
      <p
        draggable={false}
        className={`flex min-w-0 items-center gap-1 rounded bg-[var(--priority-urgent-bg)] px-2 py-1 text-xs font-bold text-[var(--priority-urgent-text)] transition ${
          draggable ? "cursor-grab select-none hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] active:cursor-grabbing" : ""
        } ${dragging ? "opacity-45 ring-2 ring-[var(--brand-primary)]" : ""}`}
        title={draggable ? "Drag to reschedule this local event" : `Event: ${item.event.title}`}
        onPointerDown={(event) => {
          if (!draggable || event.button !== 0) return;
          event.stopPropagation();
          onPointerDown?.(event);
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <CalendarPlus size={12} className="shrink-0 opacity-80" />
        <span className="truncate">{item.event.title}</span>
      </p>
    );
  }

  const status = getTaskStatusOption(item.task.status);
  return (
    <p
      draggable={false}
      className={`flex min-w-0 items-center gap-1 rounded px-2 py-1 text-xs font-bold transition ${
        draggable ? "cursor-grab select-none hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] active:cursor-grabbing" : ""
      } ${dragging ? "opacity-45 ring-2 ring-[var(--brand-primary)]" : ""}`}
      style={{ backgroundColor: status.bg, color: status.text }}
      title={draggable ? "Drag to reschedule or unschedule" : undefined}
      onPointerDown={(event) => {
        if (!draggable || event.button !== 0) return;
        event.stopPropagation();
        onPointerDown?.(event);
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <CalendarDays size={12} className="shrink-0 opacity-80" />
      <span className="truncate">{item.task.title}</span>
    </p>
  );
}

function CalendarItemRow({ item, actions }: { item: CalendarItem; actions?: ReactNode }) {
  if (item.kind === "event") {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--priority-urgent-bg)] p-3 text-sm text-[var(--priority-urgent-text)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words font-bold">{item.event.title}</p>
            <p className="mt-1 text-xs opacity-75">Local event</p>
          </div>
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-bold text-[var(--text)]">{item.task.title}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{dateLabel(item.task.dueDate, item.task.dueTime)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <OptionBadge option={getTaskPriorityOption(item.task.priority)} />
        </div>
      </div>
    </div>
  );
}

function EventActions({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit: (event: CalendarEvent) => void; onDelete: (id: string) => void }) {
  const confirm = useConfirm();

  return (
    <div className="flex shrink-0 gap-1">
      <Button title="Edit event" variant="secondary" className="min-h-8 px-2" onClick={() => onEdit(event)}>
        <Pencil size={14} />
      </Button>
      <Button
        title="Delete event"
        variant="danger"
        className="min-h-8 px-2"
        onClick={() => {
          void confirm({
            title: "Delete local event?",
            description: `"${event.title}" will be removed from your local calendar.`,
            confirmLabel: "Delete Event",
            tone: "danger",
          }).then((confirmed) => {
            if (confirmed) onDelete(event.id);
          });
        }}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

function PlannerTaskCard({
  task,
  mode,
  visibleMonth,
  selectedWeekStart,
  onPlanThisMonth,
  onPlanThisWeek,
  onPointerDown,
}: {
  task: Task;
  mode: CalendarMode;
  visibleMonth: string;
  selectedWeekStart: string;
  onPlanThisMonth: (task: Task) => void;
  onPlanThisWeek: (task: Task) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const plannedForVisibleMonth = task.plannedMonth === visibleMonth;
  const plannedForSelectedWeek = task.plannedWeekStart === selectedWeekStart;
  const showMonthAction = mode === "month";

  return (
    <article
      className="group cursor-grab rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--brand-primary)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)] active:cursor-grabbing"
      onPointerDown={onPointerDown}
      title="Drag onto the calendar to schedule"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-[var(--text)]">{task.title}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <OptionBadge option={getTaskPriorityOption(task.priority)} />
            <OptionBadge option={getTaskStatusOption(task.status)} />
            <Badge tone={task.projectId ? "purple" : "slate"}>{task.projectId ? "project" : task.category}</Badge>
          </div>
        </div>
        <CalendarPlus className="mt-0.5 shrink-0 text-[var(--text-soft)] transition group-hover:text-[var(--brand-primary)]" size={17} />
      </div>
      {showMonthAction ? (
        plannedForVisibleMonth ? (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold text-[var(--brand-primary)]">
            Monthly intent for {format(parseISO(`${visibleMonth}-01`), "MMM yyyy")}
          </p>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 min-h-8 w-full text-xs"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onPlanThisMonth(task)}
          >
            Keep in {format(parseISO(`${visibleMonth}-01`), "MMM")}
          </Button>
        )
      ) : !plannedForSelectedWeek ? (
        <Button
          type="button"
          variant="ghost"
          className="mt-3 min-h-8 w-full text-xs"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onPlanThisWeek(task)}
        >
          Plan this week
        </Button>
      ) : (
        <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold text-[var(--brand-primary)]">
          Planned week of {format(parseISO(selectedWeekStart), "MMM d")}
        </p>
      )}
    </article>
  );
}

function PlannerTaskPreview({ title, kind, x, y, offsetX, offsetY }: { title: string; kind: CalendarItem["kind"]; x: number; y: number; offsetX: number; offsetY: number }) {
  const position = getClampedDragPreviewPosition(x, y, 320, 120, { offsetX, offsetY });

  return (
    <motion.div
      className="pointer-events-none fixed z-50 w-[min(320px,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-[var(--brand-primary)] bg-[var(--surface)] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.36)]"
      style={position}
      initial={{ opacity: 0, scale: 0.96, rotate: -1 }}
      animate={{ opacity: 0.94, scale: 1, rotate: -1.1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
    >
      <p className="text-sm font-black text-[var(--text)]">{title}</p>
      <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">Drop on a date to {kind === "event" ? "reschedule" : "schedule"}</p>
    </motion.div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <p className={tone === "danger" ? "text-xl font-bold text-[var(--danger)]" : "text-xl font-bold text-[var(--text)]"}>{value}</p>
      <p className="text-xs font-bold uppercase text-[var(--text-soft)]">{label}</p>
    </div>
  );
}

function EmptyPanel({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={`rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] text-center ${compact ? "p-3" : "p-8"}`}>
      <p className="font-bold text-[var(--text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

function getCalendarItems(tasks: Task[], events: CalendarEvent[]): CalendarItem[] {
  const visibleTasks = tasks.filter((task) => Boolean(task.dueDate));
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));
  const visibleTaskTitles = new Set(visibleTasks.map((task) => normalizeCalendarTitle(task.title)));
  const visibleDateKeys = new Set([
    ...visibleTasks.map((task) => calendarDuplicateKey(task.title, task.dueDate!)),
  ]);

  return [
    ...visibleTasks.map((task) => ({ id: `task-${task.id}`, date: task.dueDate!, kind: "task" as const, task })),
    ...events
      .filter((event) => !isDuplicateCalendarEvent(event, visibleDateKeys, visibleTaskIds, visibleTaskTitles))
      .map((event) => ({ id: `event-${event.id}`, date: event.startDate, kind: "event" as const, event })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

function isDuplicateCalendarEvent(
  event: CalendarEvent,
  visibleDateKeys: Set<string>,
  visibleTaskIds: Set<string>,
  visibleTaskTitles: Set<string>,
) {
  if (event.linkedTaskId && visibleTaskIds.has(event.linkedTaskId)) return true;
  if (event.source === "google" && visibleTaskTitles.has(normalizeCalendarTitle(event.title))) return true;
  return visibleDateKeys.has(calendarDuplicateKey(event.title, event.startDate));
}

function calendarDuplicateKey(title: string, date: string) {
  return `${calendarDayKey(date)}::${normalizeCalendarTitle(title)}`;
}

function normalizeCalendarTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

function calendarDayKey(date: string) {
  try {
    return format(parseISO(date), "yyyy-MM-dd");
  } catch {
    return date.slice(0, 10);
  }
}

function itemsForDate(items: CalendarItem[], date: string) {
  return items.filter((item) => sameDay(item.date, parseISO(date)));
}

function getAgendaGroups(items: CalendarItem[], today: string) {
  const upcoming = items.filter((item) => !isBefore(parseISO(item.date), parseISO(today))).slice(0, 40);
  const map = new Map<string, CalendarItem[]>();

  upcoming.forEach((item) => {
    map.set(item.date, [...(map.get(item.date) ?? []), item]);
  });

  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function getPlannerTasks(tasks: Task[], selectedWeekStart: string, visibleMonth: string) {
  return tasks
    .filter((task) => !task.deletedAt && !task.dueDate && !isTerminalTaskStatus(task.status))
    .filter((task) => !task.plannedWeekStart || task.plannedWeekStart === selectedWeekStart)
    .filter((task) => !task.plannedMonth || task.plannedMonth === visibleMonth)
    .sort((a, b) => {
      const plannedSort = Number(Boolean(b.plannedWeekStart)) - Number(Boolean(a.plannedWeekStart));
      const monthSort = Number(Boolean(b.plannedMonth)) - Number(Boolean(a.plannedMonth));
      return plannedSort || monthSort || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || b.createdAt.localeCompare(a.createdAt);
    });
}

function getCalendarDropDate(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY);
  return element?.closest<HTMLElement>("[data-calendar-drop-date]")?.dataset.calendarDropDate ?? null;
}

function getCalendarUnscheduleDropTarget(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY);
  return element?.closest<HTMLElement>("[data-calendar-unschedule-drop]") ?? null;
}
