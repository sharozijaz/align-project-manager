import { X } from "lucide-react";
import { useEffect } from "react";
import { useTaskStore } from "../../store/taskStore";
import { Button } from "../ui/Button";

export function DeletedTaskToast() {
  const { tasks, lastDeletedTaskId, restoreTask, dismissDeleteNotice } = useTaskStore();
  const deletedTask = tasks.find((task) => task.id === lastDeletedTaskId && task.deletedAt);

  useEffect(() => {
    if (!deletedTask) return;

    const timeout = window.setTimeout(() => {
      dismissDeleteNotice();
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [deletedTask, dismissDeleteNotice]);

  if (!deletedTask) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-lg border border-slate-700 bg-slate-950/95 p-4 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur sm:left-auto sm:right-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">Task moved to Deleted Tasks</p>
        <p className="text-sm text-slate-400">{deletedTask.title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" onClick={() => restoreTask(deletedTask.id)}>
          Undo
        </Button>
        <button
          className="grid h-10 w-10 place-items-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
          title="Dismiss"
          onClick={dismissDeleteNotice}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
