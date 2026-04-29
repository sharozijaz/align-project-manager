import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isToday as dateFnsIsToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const todayKey = () => format(new Date(), "yyyy-MM-dd");

export const dateLabel = (value?: string) => {
  if (!value) return "No due date";
  return format(parseISO(value), "MMM d, yyyy");
};

export const startDateLabel = (value?: string) => {
  if (!value) return "No start date";
  return `Start ${format(parseISO(value), "MMM d, yyyy")}`;
};

export const durationLabel = (startDate?: string, endDate?: string) => {
  if (!startDate) return "No start date";
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "No start date";

  const days = Math.max(0, differenceInCalendarDays(end, start));
  if (days === 0) return "Same day";
  if (days === 1) return "1 day";
  return `${days} days`;
};

export const isToday = (value?: string) => Boolean(value && dateFnsIsToday(parseISO(value)));

export const isOverdue = (value?: string) =>
  Boolean(value && isBefore(parseISO(value), parseISO(todayKey())));

export const isUpcoming = (value?: string) =>
  Boolean(value && isAfter(parseISO(value), parseISO(todayKey())));

export const monthGrid = (visibleDate: Date) => {
  const start = startOfWeek(startOfMonth(visibleDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(visibleDate), { weekStartsOn: 1 });
  const days: Date[] = [];
  let day = start;

  while (day <= end) {
    days.push(day);
    day = addDays(day, 1);
  }

  return days;
};

export const sameDay = (value: string, date: Date) => isSameDay(parseISO(value), date);
