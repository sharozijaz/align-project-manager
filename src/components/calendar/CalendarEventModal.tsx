import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import type { CalendarEvent, CalendarEventInput } from "../../types/calendar";

export function CalendarEventModal({
  open,
  date,
  onClose,
  onSubmit,
  initialEvent,
}: {
  open: boolean;
  date: string;
  onClose: () => void;
  onSubmit: (input: CalendarEventInput) => void;
  initialEvent?: CalendarEvent;
}) {
  const [title, setTitle] = useState(initialEvent?.title ?? "");

  useEffect(() => {
    setTitle(initialEvent?.title ?? "");
  }, [initialEvent, open]);

  return (
    <Modal title="Add calendar item" open={open} onClose={onClose}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          onSubmit({ title: title.trim(), startDate: initialEvent?.startDate ?? date, endDate: initialEvent?.endDate });
          setTitle("");
          onClose();
        }}
      >
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event or task title" required />
        <Input type="date" value={initialEvent?.startDate ?? date} readOnly />
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{initialEvent ? "Save Event" : "Add Event"}</Button>
        </div>
      </form>
    </Modal>
  );
}
